import { IReleaseStateStore } from "@shepherdorg/state-store"
import { TFeatureDeploymentConfig } from "../triggered-deployment/create-upstream-trigger-deployment-config"
import { IExec } from "../helpers/basic-types"
import { DeploymentOrchestration } from "../deployment-orchestration/deployment-orchestration"
import {
  createDeploymentPlanFactory,
  IDeploymentPlanFactory,
  TDeploymentPlanDependencies,
} from "../deployment-plan/deployment-plan"
import { createHerdLoader } from "./herd-loader"
import { getDockerRegistryClientsFromConfig, imageLabelsLoader } from "@shepherdorg/docker-image-metadata-loader"
import { IPushToShepherdUI } from "../shepherd"
import { createRolloutWaitActionFactory } from "../deployment-actions/kubectl-action/rollout-wait-action-factory"
import { createDockerImageKubectlDeploymentActionsFactory } from "../deployment-actions/kubectl-action/create-docker-kubectl-deployment-actions"
import {
  createKubectlDeploymentActionsFactory,
  ICreateKubectlDeploymentAction,
} from "../deployment-actions/kubectl-action/kubectl-deployment-action-factory"
import { createDockerDeployerActionFactory } from "../deployment-actions/docker-action/create-docker-deployment-action"
import { createDockerActionFactory } from "../deployment-actions/docker-action/docker-action"
import { createDeploymentTestActionFactory, ICreateDeploymentTestAction } from "../deployment-actions/deployment-test-action/deployment-test-action"
import { createFolderActionFactory } from "./folder-loader/folder-action-factory"
import { createFolderDeploymentPlanner } from "./folder-loader/create-folder-deployment-planner"
import { ILog } from "../logging/logger"
import { createLogContextColors } from "../logging/log-context-colors"

interface TLoaderContextParams {
  stateStore: IReleaseStateStore
  logger: ILog
  featureDeploymentConfig: TFeatureDeploymentConfig
  exec: IExec
  uiPusher: IPushToShepherdUI
  environment: string
}

export function createLoaderContext({
  stateStore,
  logger,
  featureDeploymentConfig,
  exec,
  uiPusher,
  environment
}: TLoaderContextParams) {
  const deploymentOrchestration = DeploymentOrchestration({
    cmd: exec,
    logger: logger,
    stateStore: stateStore,
  })

  let deploymentActionFactory: ICreateKubectlDeploymentAction = createKubectlDeploymentActionsFactory({
    exec,
    logger,
    stateStore,
  })
  let rolloutWaitActionFactory = createRolloutWaitActionFactory({
    exec: exec,
    logger: logger,
    stateStore: stateStore,
  })
  let dockerImageKubectlDeploymentActionFactory = createDockerImageKubectlDeploymentActionsFactory({
    deploymentActionFactory,
    logger,
    environment: environment
  })
  let dockerActionFactory = createDockerActionFactory({
    exec,
    logger,
    stateStore,
  })
  let deployerActionFactory = createDockerDeployerActionFactory({
    executionActionFactory: dockerActionFactory,
    logger: logger,
    environment:environment
  })

  let deploymentTestActionFactory: ICreateDeploymentTestAction = createDeploymentTestActionFactory({
    logger,
    dockerActionFactory,
  })

  let planDependencies: TDeploymentPlanDependencies = {
    uiDataPusher: uiPusher,
    exec: exec,
    logger: logger,
    stateStore: stateStore,
    rolloutWaitActionFactory: rolloutWaitActionFactory,
    dockerImageKubectlDeploymentActionFactory: dockerImageKubectlDeploymentActionFactory,
    deployerActionFactory,
    deploymentTestActionFactory,
    logContextColors: createLogContextColors()
  }

  let planFactory: IDeploymentPlanFactory = createDeploymentPlanFactory(planDependencies)

  const folderActionFactory = createFolderActionFactory({
    environment: environment,
    logger,
    kubectlDeploymentActionFactory: deploymentActionFactory,
  })


  const folderLoader = createFolderDeploymentPlanner({
    logger,
    planFactory: planFactory,
    folderActionFactory: folderActionFactory
  })


  return {
    loader: createHerdLoader({
      logger: logger,
      deploymentOrchestration: deploymentOrchestration,
      exec: exec,
      featureDeploymentConfig,
      planFactory: planFactory,
      stateStore: stateStore,
      folderLoader: folderLoader,
      labelsLoader: {
        imageLabelsLoader: imageLabelsLoader,
        getDockerRegistryClientsFromConfig: getDockerRegistryClientsFromConfig,
      },
    })
  }
}
