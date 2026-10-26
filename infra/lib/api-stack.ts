import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import type { Construct } from "constructs";

// The Docker build runs from the repo root, same as `docker build ... .`
const repoRoot = path.join(__dirname, "..", "..");

export class OpenDoorApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Network: public subnets only, and no NAT gateway (a NAT costs ~$32/month)
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
    });

    // 2. Cluster: the logical home for the service
    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    // 3. Logs: kept a week, and deleted when the stack is destroyed
    const logGroup = new logs.LogGroup(this, "ApiLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4. Task definition: the smallest Fargate size, on ARM (Graviton)
    const taskDefinition = new ecs.FargateTaskDefinition(this, "ApiTask", {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // 5. The container: built from your Dockerfile and uploaded by CDK
    taskDefinition.addContainer("api", {
      image: ecs.ContainerImage.fromAsset(repoRoot, {
        file: "apps/api/Dockerfile",
        platform: Platform.LINUX_ARM64,
      }),
      portMappings: [{ containerPort: 4000 }],
      environment: { PORT: "4000" },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "api", logGroup }),
    });

    // 6. Firewall: allow requests to port 4000 from anywhere (fine for a health check demo)
    const securityGroup = new ec2.SecurityGroup(this, "ApiSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "OpenDoor API",
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4000), "API from anywhere");

    // 7. Service: keeps exactly one task running, with a public IP and no load balancer
    const service = new ecs.FargateService(this, "ApiService", {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [securityGroup],
      // On redeploy, stop the old task before starting the new one (one task, one IP at a time)
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      // If the new version keeps crashing, roll back instead of retrying forever
      circuitBreaker: { rollback: true },
    });

    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "ServiceName", { value: service.serviceName });
  }
}