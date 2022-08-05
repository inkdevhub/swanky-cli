import { ListrTaskWrapper, ListrDefaultRenderer, ListrRenderer } from "listr2";
import execa = require("execa");

export async function checkCliDependencies(
  dependencyList: { dependencyName: string; versionCommand: string }[]
) {
  return {
    title: "Checking dependencies",
    task: function <T>(
      _ctx: T,
      task: ListrTaskWrapper<T, typeof ListrRenderer>
    ) {
      const tasks = dependencyList.map(
        ({ dependencyName, versionCommand }) => ({
          title: `Checking ${dependencyName}`,
          task: () => {
            try {
              execa.commandSync(versionCommand, {});
            } catch {
              throw new Error(
                `"${dependencyName}" is not installed. Please follow the guide: https://docs.substrate.io/tutorials/v3/ink-workshop/pt1/#update-your-rust-environment`
              );
            }
          },
        })
      );
      return task.newListr(tasks, { concurrent: true });
    },
  };
}
