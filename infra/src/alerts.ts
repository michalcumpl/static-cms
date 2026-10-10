// Alerts by email (admin-on-aws design.md decision 8) for the admin's server and the redirect
// server, from both regions: Route 53's health check metrics exist only in us-east-1. The
// operator confirms each subscription once.
import * as aws from "@pulumi/aws";
import { config, name, usEast1 } from "./hosting.js";

export const alertEmail = config.requireSecret("alertEmail");

const alertTopic = (provider?: aws.Provider) => {
  const suffix = provider ? "-us-east-1" : "";
  const topic = new aws.sns.Topic(name(`alerts${suffix}`), { name: name("alerts") }, { provider });
  new aws.sns.TopicSubscription(
    name(`alerts${suffix}`),
    { topic: topic.arn, protocol: "email", endpoint: alertEmail },
    { provider },
  );
  return topic.arn;
};
/** The topic in the stack's region, for the servers' own alarms. */
export const alerts = alertTopic();
/** The topic in us-east-1, for alarms on Route 53's health checks. */
export const alertsUsEast1 = alertTopic(usEast1);
