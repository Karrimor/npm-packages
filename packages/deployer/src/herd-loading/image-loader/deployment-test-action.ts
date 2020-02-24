import { TImageMetadata, TTestSpecification } from "@shepherdorg/metadata"
import {
  IExecutableAction,
  ILog,
  IRollbackActionExecution,
  TActionExecutionOptions,
} from "../../deployment-types"
import { ICreateDockerActions } from "../../deployment-actions/docker-action/docker-action"
import { isOops } from "../../helpers/isOops"

export interface ICreateDeploymentTestAction {
  createDeploymentTestAction(
    deployTestDeclaration: TTestSpecification,
    shepherdMetadata: TImageMetadata,
    rollbackActions?: Array<IRollbackActionExecution>
  ): IExecutableAction
}

export type TDeploymentTestActionFactoryDependencies = { dockerActionFactory:ICreateDockerActions, logger: ILog }

export function createDeploymentTestActionFactory({dockerActionFactory, logger}:TDeploymentTestActionFactoryDependencies) {
  function createDeploymentTestAction(
    deployTestDeclaration: TTestSpecification,
    shepherdMetadata: TImageMetadata,
    rollbackActions?: Array<IRollbackActionExecution>
  ): IExecutableAction {
    let dockerExecutionAction = dockerActionFactory.createDockerExecutionAction(
      shepherdMetadata,
      deployTestDeclaration.dockerImageUrl || (shepherdMetadata.dockerImageUrl as string),
      shepherdMetadata.displayName,
      "testHerdKey",
      deployTestDeclaration.command,
      deployTestDeclaration.environment || []
    )

    const rollbackEnablingExecution = {
      execute: async function(
        deploymentOptions: TActionExecutionOptions
      ): Promise<IExecutableAction> {
        return dockerExecutionAction.execute(deploymentOptions).catch(async testError => {
          if (rollbackActions && rollbackActions.length) {
            logger.warn("Test failed, rolling back to last good version!")
            await Promise.all(rollbackActions.map(rollback=>rollback.rollback()))
          }
          if(isOops(testError)){
            logger.error('Test output: vvvvvvvvvvvvvvvv')
            // @ts-ignore
            logger.error(testError.context.stdOut)
            logger.error('^^^^^^^^^^^^^^^^^^^^^^^')
          }
          throw testError
        })
      },
    }
    return {
      ...dockerExecutionAction,
      ...rollbackEnablingExecution,
    }
  }

  return {
    createDeploymentTestAction,
  }
}
