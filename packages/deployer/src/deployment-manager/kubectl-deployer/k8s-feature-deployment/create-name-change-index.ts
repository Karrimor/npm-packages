import * as path from "path"

const yamlLoad = require('./multipart-yaml-load');

type TStringMap = {
  [key:string]:string
}

export interface TBranchModificationParams {
  shouldModify: boolean
  origin?: string
  branchName?: string
  ttlHours?: number
  nameChangeIndex?: TStringMap
}


export function indexNameReferenceChange (deploymentDescriptor, branchModificationParams) {
  let nameChangeIndex = branchModificationParams.nameChangeIndex || {}
  if (!deploymentDescriptor.metadata) {
    console.warn("deploymentDescriptor without metadata!", deploymentDescriptor)
    return
  }
  nameChangeIndex[deploymentDescriptor.kind] = nameChangeIndex[deploymentDescriptor.kind] || {}
  nameChangeIndex[deploymentDescriptor.kind][deploymentDescriptor.metadata.name] =
    deploymentDescriptor.metadata.name + "-" + branchModificationParams.branchName
}

export function addResourceNameChangeIndex(plan, kubeSupportedExtensions, branchModificationParams) {
  branchModificationParams.nameChangeIndex = branchModificationParams.nameChangeIndex || {}
  Object.entries(plan.files  as Array<any>).forEach(([fileName, deploymentFileContent]) => {
    let fileExtension = path.extname(fileName)
    if (!fileExtension) {
      return
    }
    if (!kubeSupportedExtensions[fileExtension]) {
      console.debug(`Unsupported extension ${fileExtension} on file ${fileName}`)
      return
    }

    if (deploymentFileContent.content) {
      let parsedMultiContent = yamlLoad(deploymentFileContent.content)
      parsedMultiContent.forEach(function(parsedContent) {
        if (parsedContent) {
          indexNameReferenceChange(parsedContent, branchModificationParams)
        } else {
          console.warn("Parsed content is NULL!!!", deploymentFileContent.content)
        }
      })

    }
  })
  return branchModificationParams
}