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
const bolt_1 = require("@slack/bolt");
const web_api_1 = require("@slack/web-api");
const rest_1 = require("@octokit/rest");
const octokit = new rest_1.Octokit({ auth: `token ${process.env.GH_SECRET}` });
const token = process.env.SLACK_BOT_TOKEN || "";
const signingSecret = process.env.SLACK_SIGNING_SECRET || "";
const slackAppToken = process.env.SLACK_APP_TOKEN || "";
const channel_id = process.env.SLACK_CHANNEL_ID || "";
const env = process.env.DEPLOYMENT_ENV || "";
const app = new bolt_1.App({
    token: token,
    signingSecret: signingSecret,
    appToken: slackAppToken,
    socketMode: true,
    port: 3000,
    logLevel: bolt_1.LogLevel.DEBUG,
});
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
            (() => __awaiter(this, void 0, void 0, function* () {
                yield web.chat.postMessage({
                    channel: channel_id,
                    text: "GitHub Actions Approval request",
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `GitHub Actions Approval Request`,
                            },
                        },
                        {
                            type: "section",
                            fields: [
                                {
                                    type: "mrkdwn",
                                    text: `*GitHub Actor:*\n${actor}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Repos:*\n${github_server_url}/${github_repos}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Branch:* ${branch}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Env:* ${env}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Actions URL:*\n${actionsUrl}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*GITHUB_RUN_ID:*\n${run_id}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Workflow:*\n${workflow}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*RunnerOS:*\n${runnerOS}`,
                                },
                            ],
                        },
                        {
                            type: "actions",
                            elements: [
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        emoji: true,
                                        text: "Approve",
                                    },
                                    style: "primary",
                                    value: "approve",
                                    action_id: "slack-approval-approve",
                                },
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        emoji: true,
                                        text: "Reject",
                                    },
                                    style: "danger",
                                    value: "reject",
                                    action_id: "slack-approval-reject",
                                },
                            ],
                        },
                    ],
                });
            }))();
            app.action("slack-approval-approve", ({ ack, client, body, logger }) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                yield ack();
                try {
                    const ownerRepo = (_a = process.env.GITHUB_REPOSITORY) === null || _a === void 0 ? void 0 : _a.split("/");
                    const owner = ownerRepo[0];
                    const repo = ownerRepo[1];
                    yield octokit.repos.createDispatchEvent({
                        owner,
                        repo,
                        event_type: "approved-deployment", // Customize this event type as needed
                    });
                    const response_blocks = (_b = body.message) === null || _b === void 0 ? void 0 : _b.blocks;
                    response_blocks.pop();
                    response_blocks.push({
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `Approved by <@${body.user.id}> `,
                        },
                    });
                    yield client.chat.update({
                        channel: ((_c = body.channel) === null || _c === void 0 ? void 0 : _c.id) || "",
                        ts: ((_d = body.message) === null || _d === void 0 ? void 0 : _d.ts) || "",
                        blocks: response_blocks,
                    });
                }
                catch (error) {
                    logger.error(error);
                }
                process.exit(0);
            }));
            app.action("slack-approval-reject", ({ ack, client, body, logger }) => __awaiter(this, void 0, void 0, function* () {
                var _e, _f, _g;
                yield ack();
                try {
                    const response_blocks = (_e = body.message) === null || _e === void 0 ? void 0 : _e.blocks;
                    response_blocks.pop();
                    response_blocks.push({
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `Rejected by <@${body.user.id}>`,
                        },
                    });
                    yield client.chat.update({
                        channel: ((_f = body.channel) === null || _f === void 0 ? void 0 : _f.id) || "",
                        ts: ((_g = body.message) === null || _g === void 0 ? void 0 : _g.ts) || "",
                        blocks: response_blocks,
                    });
                }
                catch (error) {
                    logger.error(error);
                }
                process.exit(1);
            }));
            (() => __awaiter(this, void 0, void 0, function* () {
                yield app.start(3000);
                console.log("Waiting Approval reaction.....");
            }))();
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
