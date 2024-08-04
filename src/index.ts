import * as core from "@actions/core";
import bolt, { MrkdwnElement, Button } from "@slack/bolt";
import { ChatPostMessageResponse, WebClient } from "@slack/web-api";
import process from "process";
const { App } = bolt;
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const inputsFromEnv: { [key: string]: string } = {
  'slack-bot-token': process.env.SLACK_BOT_TOKEN || "",
  'slack-channel-id': process.env.SLACK_CHANNEL_ID || "",
  'deployment-env': process.env.DEPLOYMENT_ENV || "",
  'slack-workspace': process.env.SLACK_WORKSPACE || "",
  'confirmation': process.env.CONFIRMATION || "",
  'auto-approve-timeout': process.env.AUTO_APPROVE_TIMEOUT || "300" // Defaults to 5 seconds (300 seconds)
};

const getInput = (name: string): string =>  isProd ? core.getInput(name) : inputsFromEnv[name];

async function run() {
  try {
    const token = getInput("slack-bot-token");
    const channelId = getInput("slack-channel-id");
    const env = getInput("deployment-env");
    const workspace = getInput("slack-workspace");
    const confirmationRequired = getInput("confirmation") === "true";
    const autoApproveTimeout = parseInt(getInput("auto-approve-timeout")) * 1000; // convert to milliseconds

    const web = new WebClient(token);

    const githubServerUrl = process.env.GITHUB_SERVER_URL || "";
    const githubRepos = process.env.GITHUB_REPOSITORY || "";
    const runId = process.env.GITHUB_RUN_ID || "";
    const actionsUrl = `${githubServerUrl}/${githubRepos}/actions/runs/${runId}`;
    const workflow = process.env.GITHUB_WORKFLOW || "";
    const runnerOS = process.env.RUNNER_OS || "";
    const actor = process.env.GITHUB_ACTOR || "";
    const branch = process.env.GITHUB_REF || "";
    const prLink = process.env.PR_LINK || undefined;
    const commitMessage = process.env.COMMIT_MESSAGE || undefined;

    const sha = process.env.COMMIT_SHA || "";
    const triggerSha = process.env.GITHUB_SHA || "";
    const customId = JSON.stringify({
      repo: githubRepos,
      run_id: runId,
      env: env,
      sha: sha,
      triggersha: triggerSha,
    });

    let fields: MrkdwnElement[] = [
      { type: "mrkdwn", text: `*GitHub Actor:*\n${actor}` },
      { type: "mrkdwn", text: `*Branch:* ${branch}` },
      { type: "mrkdwn", text: `*Env:* ${env}` },
    ];

    // Add PR details only if they exist:
    if (prLink) {
      fields.push({ type: "mrkdwn", text: `*Pull Request:*\n${prLink}` });
    }
    if (commitMessage) {
      fields.push({
        type: "mrkdwn",
        text: `*COMMIT_MESSAGE:*\n${commitMessage}`,
      });
    }

    fields.push(
      { type: "mrkdwn", text: `*Actions URL:*\n${actionsUrl}` },
      { type: "mrkdwn", text: `*GITHUB_RUN_ID:*\n${runId}` },
      {
        type: "mrkdwn", text: `*Repos:*\n${githubServerUrl}/${githubRepos}`,
      },
      { type: "mrkdwn", text: `*Workflow:*\n${workflow}` },
      { type: "mrkdwn", text: `*RunnerOS:*\n${runnerOS}` }
    );

    const approveButton: Button = {
      type: "button",
      text: {
        type: "plain_text",
        emoji: true,
        text: "Approve",
      },
      style: "primary",
      value: "approve",
      action_id: "slack-approval-approve",
      confirm: undefined,
    };

    const rejectButton: Button = {
      type: "button",
      text: {
        type: "plain_text",
        emoji: true,
        text: "Reject",
      },
      style: "danger",
      value: "reject",
      action_id: "slack-approval-reject",
      confirm: undefined,
    };

    if (confirmationRequired) {
      approveButton.confirm = {
        title: {
          type: "plain_text",
          text: "Are you sure?",
        },
        text: {
          type: "mrkdwn",
          text: "Do you really want to approve this action?",
        },
        confirm: {
          type: "plain_text",
          text: "Yes, Approve",
        },
        deny: {
          type: "plain_text",
          text: "Cancel",
        },
      };

      rejectButton.confirm = {
        title: {
          type: "plain_text",
          text: "Are you sure?",
        },
        text: {
          type: "mrkdwn",
          text: "Do you really want to reject this action?",
        },
        confirm: {
          type: "plain_text",
          text: "Yes, Reject",
        },
        deny: {
          type: "plain_text",
          text: "Cancel",
        },
      };
    }

    const response: ChatPostMessageResponse = await web.chat.postMessage({
      channel: channelId,
      text: `GitHub Actions Approval Request\n*${githubRepos}*\n${branch}, ${env}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `GitHub Actions Approval Request\n*${githubRepos}*\n${branch}, ${env}`,
          },
        },
        {
          type: "section",
          fields: fields,
        },
        {
          type: "actions",
          block_id: customId,
          elements: [approveButton, rejectButton],
        },
      ],
    });

    const ts: any = response.ts;
    const formattedTs = "p" + ts.split(".").join("");

    const slackMessageLink = `https://${workspace}.slack.com/archives/${channelId}/${formattedTs}`;
    core.info(`Direct link to the Slack message: ${slackMessageLink}`);

    // Listen for approval response
    const app = new App({
      token: token,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
    });

    let approvalStatus = "pending";

    const approvalPromise = new Promise((resolve) => {
      app.action("slack-approval-approve", async ({ ack, say }: any) => {
        await ack();
        approvalStatus = "approved";
        await say("Deployment approved.");
        resolve("approved");
      });

      app.action("slack-approval-reject", async ({ ack, say }: any) => {
        await ack();
        approvalStatus = "rejected";
        await say("Deployment rejected.");
        resolve("rejected");
      });
    });

    await app.start(3000);

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (approvalStatus === "pending") {
          console.log("Timed out waiting for approval - auto approving")
          approvalStatus = "approved";
          resolve("approved");
        }
      }, autoApproveTimeout);
    });

    await Promise.race([approvalPromise, timeoutPromise]);

    core.setOutput("approval-status", approvalStatus);

    // Exit the process based on the approval status
    process.exit(approvalStatus === "approved" ? 0 : 1);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
    process.exit(1);
  }
}

run();