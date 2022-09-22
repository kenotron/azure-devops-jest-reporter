/**
 * Much of this code is borrowed from @jest/reporters's GithubActionReporter,
 * It is modified to show errors at the right location for Azure DevOps PRs
 */

const stripAnsi = require("strip-ansi");
import type { TestResult } from "@jest/test-result";
import type { Test } from "@jest/reporters";
import type { Config } from "@jest/types";
import { getStackTraceLines, getTopFrame, separateMessageFromStack } from "jest-message-util";
import BaseReporter from "@jest/reporters/build/BaseReporter";

type AnnotationOptions = {
  file?: string;
  line?: number | string;
  message: string;
  title: string;
  type: "error" | "warning";
};

const titleSeparator = " \u203A ";

export default class AzureDevopsReporter extends BaseReporter {
  static readonly filename = __filename;

  onTestFileResult({ context }: Test, { testResults }: TestResult): void {
    testResults.forEach((result) => {
      const title = [...result.ancestorTitles, result.title].join(titleSeparator);

      result.failureMessages.forEach((failureMessage) => {
        this.#createAnnotation({
          ...this.#getMessageDetails(failureMessage, context.config),
          title,
          type: "error",
        });
      });
    });
  }

  #getMessageDetails(failureMessage: string, _config: Config.ProjectConfig) {
    const { message, stack } = separateMessageFromStack(failureMessage);

    const stackLines = getStackTraceLines(stack);
    const topFrame = getTopFrame(stackLines);

    // const normalizedStackLines = stackLines.map((line) => formatPath(line, config));
    const normalizedStackLines = stackLines;
    const messageText = [message, ...normalizedStackLines].join("\n");

    return {
      file: topFrame?.file,
      line: topFrame?.line,
      message: messageText,
    };
  }

  #createAnnotation({ file, line, message, type }: AnnotationOptions) {
    message = stripAnsi(
      // copied from: https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
      message.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")
    );

    this.log(
      `##vso[task.logissue type=${type};sourcepath=${file};linenumber=${line};columnnumber=1;code=100;]${message}\n`
    );
  }
}
