import { deploymentData0, deploymentData1 } from "./testdata/deployment-json/shepherd-deployment-data"
import { expectedK8sDeployment0, expectedK8sDeployment1 } from "./testdata/deployment-json/expected"
import { expect } from "chai"
import { TDeploymentType } from "./index"
import { mapUntypedDeploymentData } from "./map-untyped-deployment-data"


function expectMappedToMatchExpectedData(deploymentInfo, expectedData, deploymentType ) {
  let mappedData = mapUntypedDeploymentData(deploymentInfo)


  expect(deploymentType).to.equal(mappedData.deploymentType)
  expect(expectedData).to.deep.equal(mappedData)
}

describe("raw deployment data mapping", function() {

  it("should map from deployment data 1", () => {
    expectMappedToMatchExpectedData(deploymentData0(), expectedK8sDeployment0(), TDeploymentType.Kubernetes)
  })

  it("should map from deployment data 1", () => {
    expectMappedToMatchExpectedData(deploymentData1(), expectedK8sDeployment1(), TDeploymentType.Kubernetes)
  })

})
