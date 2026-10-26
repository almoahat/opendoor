import * as cdk from "aws-cdk-lib";
import { OpenDoorApiStack } from "../lib/api-stack";

const app = new cdk.App();

new OpenDoorApiStack(app, "OpenDoorApi", {
  // Your account comes from your `aws login` session; the region is your project's
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-2" },
});