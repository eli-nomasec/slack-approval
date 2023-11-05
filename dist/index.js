"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const web_api_1 = require("@slack/web-api");
const token = process.env.SLACK_BOT_TOKEN || "";
const channel_id = process.env.SLACK_CHANNEL_ID || "";
const env = process.env.DEPLOYMENT_ENV || "";
const workspace = process.env.SLACK_WORKSPACE || "";
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const web = new web_api_1.WebClient(token);
            const github_server_url = process.env.GITHUB_SERVER_URL || "";
            const github_repos = process.env.GITHUB_REPOSITORY || "";
            const run_id = process.env.GITHUB_RUN_ID || "";
            const actionsUrl = `${github_server_url}/${github_repos}/actions/runs/${run_id}`;
            const workflow = process.env.GITHUB_WORKFLOW || "";
            const runnerOS = process.env.RUNNER_OS || "";
            const actor = process.env.GITHUB_ACTOR || "";
            const branch = process.env.GITHUB_REF || "";
            const pr_link = process.env.PR_LINK || undefined;
            const commit_message = process.env.COMMIT_MESSAGE || undefined;
            const confirmationRequired = process.env.CONFIRMATION === 'true';
            const sha = process.env.COMMIT_SHA || "";
            const triggerSha = process.env.GITHUB_SHA || "";
            const customId = JSON.stringify({
                repo: github_repos,
                run_id: run_id,
                env: env,
                sha: sha,
                triggersha: triggerSha,
            });
            let fields = [
                { type: "mrkdwn", text: `*GitHub Actor:*\n${actor}` },
                { type: "mrkdwn", text: `*Branch:* ${branch}` },
                { type: "mrkdwn", text: `*Env:* ${env}` },
            ];
            // Add PR details only if they exist:
            if (pr_link) {
                fields.push({ type: "mrkdwn", text: `*Pull Request:*\n${pr_link}` });
            }
            if (commit_message) {
                fields.push({
                    type: "mrkdwn",
                    text: `*COMMIT_MESSAGE:*\n${commit_message}`,
                });
            }
            fields.push({ type: "mrkdwn", text: `*Actions URL:*\n${actionsUrl}` }, { type: "mrkdwn", text: `*GITHUB_RUN_ID:*\n${run_id}` }, {
                type: "mrkdwn",
                text: `*Repos:*\n${github_server_url}/${github_repos}`,
            }, { type: "mrkdwn", text: `*Workflow:*\n${workflow}` }, { type: "mrkdwn", text: `*RunnerOS:*\n${runnerOS}` });
            const approveButton = {
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
            const rejectButton = {
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
                        text: "Are you sure?"
                    },
                    text: {
                        type: "mrkdwn",
                        text: "Do you really want to approve this action?"
                    },
                    confirm: {
                        type: "plain_text",
                        text: "Yes, Approve"
                    },
                    deny: {
                        type: "plain_text",
                        text: "Cancel"
                    },
                };
                rejectButton.confirm = {
                    title: {
                        type: "plain_text",
                        text: "Are you sure?"
                    },
                    text: {
                        type: "mrkdwn",
                        text: "Do you really want to reject this action?"
                    },
                    confirm: {
                        type: "plain_text",
                        text: "Yes, Reject"
                    },
                    deny: {
                        type: "plain_text",
                        text: "Cancel"
                    },
                };
            }
            const response = yield web.chat.postMessage({
                channel: channel_id,
                text: `GitHub Actions Approval Request\n*${github_repos}*\n${branch}, ${env}`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `GitHub Actions Approval Request\n*${github_repos}*\n${branch}, ${env}`,
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
            const ts = response.ts;
            const formattedTs = "p" + ts.split(".").join("");
            const slackMessageLink = `https://${workspace}.slack.com/archives/${channel_id}/${formattedTs}`;
            core.info(`Direct link to the Slack message: ${slackMessageLink}`);
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
