const inject = require("@shepherdorg/nano-inject").inject
const expect = require("chai").expect
const addShepherdMetadata = require("./add-shepherd-metadata")

let ImageDeploymentPlanner = require("./image-deployment-planner")

function createNewTestDeployerPlanner(featureDeploymentConfig) {
  return ImageDeploymentPlanner(
    inject({
      kubeSupportedExtensions: {
        ".yml": true,
        ".yaml": true,
        ".json": true,
      },
      logger: {
        info: () => {
          console.error("INFO", arguments)
        },
      },
      featureDeploymentConfig,
    })
  ).createImageDeployerPlan
}

function loadTestPlans(dockerDeployerMetadata, featureDeploymentConfig) {
  return addShepherdMetadata(dockerDeployerMetadata).then(createNewTestDeployerPlanner(featureDeploymentConfig))
}

function loadFirstTestPlan(dockerDeployerMetadata, featureDeploymentConfig) {
  return loadTestPlans(dockerDeployerMetadata, featureDeploymentConfig).then(plans => {
    return plans[0]
  })
}

async function setEnv(envObj) {
  Object.entries(envObj).forEach(([key, value]) => {
    process.env[key] = value
  })
  return envObj
}

async function clearEnv(envObj) {
  Object.keys(envObj).forEach(key => {
    delete process.env[key]
  })
  return envObj
}

describe("Docker image plan loader", function() {
  let testEnv = {
    ENV: "testenv"
  }

  before(() => setEnv(testEnv))
  after(() => clearEnv(testEnv))

  describe("image deployer, old style docker labels", function() {
    let dockerDeployerMetadata = {
      imageDefinition: {
        herdKey: "testimage",
        image: "testenvimage-migrations",
        imagetag: "0.0.0",
      },
      dockerLabels: {
        "shepherd.builddate": "Tue 26 Dec 14:52:52 GMT 2017",
        "shepherd.deployer": "true",
        "shepherd.deployer.command": "ls",
        "shepherd.deployer.environment": "THIS_IS_DEPLOYER_ONE=true",
        "shepherd.environment.variables": "DB_PASS=$MICRO_SITES_DB_PASSWORD",
        "shepherd.git.branch": "master",
        "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
        "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
        "shepherd.lastcommits":
          "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
        "shepherd.name": "Testimage",
        "shepherd.version": "0.0.0",
      },
    }

    describe("with command specified", function() {
      let firstPlan
      let testEnv = {
        EXPORT1: "export1",
        MICRO_SITES_DB_PASSWORD: "pass",
      }

      before(async function() {
        firstPlan = await setEnv(testEnv).then(() => loadFirstTestPlan(dockerDeployerMetadata, {}))
      })

      after(() => clearEnv(testEnv))

      it("should extract wanted environment variables from image metadata", function() {
        expect(firstPlan).not.to.equal(undefined)
      })

      it("should have image", function() {
        expect(firstPlan.dockerParameters).to.contain("testenvimage-migrations:0.0.0")
      })

      it("should extract shepherd.deployer.command and use as plan command", function() {
        expect(firstPlan.command).to.equal("ls")
      })

      it("should add plan command as last parameter", function() {
        expect(firstPlan.dockerParameters[firstPlan.dockerParameters.length - 1]).to.equal("ls")
      })

      it("should have herdKey", function() {
        expect(firstPlan.herdKey).to.equal("testimage")
      })

      it("should have metadata", () => {
        expect(firstPlan.metadata).not.to.equal(undefined)
        expect(firstPlan.metadata.displayName).to.equal("Testimage")
      })

      it("should have herdspec", () => {
        expect(firstPlan.herdSpec.herdKey).to.equal("testimage")
      })
    })

    describe("no command specified", function() {
      let firstPlan

      let dockerDeployerMetadata = {
        imageDefinition: {
          herdKey: "testimage",
          image: "testenvimage-migrations",
          imagetag: "0.0.0",
        },
        dockerLabels: {
          "shepherd.builddate": "Tue 26 Dec 14:52:52 GMT 2017",
          "shepherd.deployer": "true",
          "shepherd.deployer.environment": "THIS_IS_DEPLOYER_ONE=true",
          "shepherd.environment.variables": "EXPORT1=${EXPORT1},DB_PASS=$MICRO_SITES_DB_PASSWORD",
          "shepherd.git.branch": "master",
          "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
          "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
          "shepherd.lastcommits":
            "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
          "shepherd.name": "Testimage",
          "shepherd.version": "0.0.0",
        },
      }

      let testEnv = {
        EXPORT1: "export1",
        MICRO_SITES_DB_PASSWORD: "pass",
      }

      before(async function() {
        firstPlan = await setEnv(testEnv).then(() => loadFirstTestPlan(dockerDeployerMetadata, {}))
      })

      after(() => clearEnv(testEnv))

      it("should use deploy as default command", function() {
        expect(firstPlan.dockerParameters[firstPlan.dockerParameters.length - 1]).to.equal("deploy")
      })
    })

    describe("missing env variables", function() {
      it("should fail with message indicating label containing problematic env reference.", function() {
        return loadTestPlans(dockerDeployerMetadata, {})
          .then(function() {
            expect.fail("Not expecting to load plan successfully")
          })
          .catch(function(err) {
            expect(err.toString()).to.contain("Reference to environment variable")
          })
      })
    })
  })

  describe("docker deployer, shepherd.json labels", async () => {
    const dockerDeployerMetadata = {
      imageDefinition: {
        herdKey: "testimage-shepherd-json",
        image: "testenvimage-shepherd-json",
        imagetag: "0.0.5",
      },
      dockerLabels: {
        "shepherd.metadata":
          "H4sIAIvzv10AA+1U0W6bMBTd874C8bqRmCSQgjRpkLYEKYGtyeiWaaqMccCNwZltmqZV/n0mZO06ad3LpmlSjoTsXM65vtfnElHgdYF51rkWrHrxdwAAsAcDrVmHtrVfQa/9vd8C29TMvmUNh0PTNvsaMAfAAi808JfqeYJaSMhVKXlNKXmGp2jL5TPv2160h/U/wb2e1oRmp1Bi3dV7wHQM0zTAYA4cd2C7lvkKABcA/XXLGzMhI1g23KCmsM5rLowpRD5jK+MdZx3KEKSKnTG0wjwsYY7nMFd0iYU0SpJzKAmrDNK8MSq8WTJeQulS2BCeCgMiCyiK34tBB3Rs24BDkJ04Ta05keNW+STmc1ihJlpCITFvgx84VRG1eaueok47iJXu7PBZxDzvVuvSWEO0UmeKjuK0shErS7V3dcc2wcC2rOUQ9WxzOUwhAEuYOelJH5040LGsLBta4ETJqDq21QklDM+jIhtt8inx47T/KZ9ee7fxzLuNTtldPGebaOvx6am3mY58gmf+OEPxJg3OzUU/2Ybn0zo8Syp4eXuHek49IZ6czEB+UdIafoxYOI5MNPZvUPU+X5TONgySOivpNu1ZcnFpgTBwCCyT62zkr1Pi38Eg2ahnuxhZX5t8YbC4QcRfLT76Iu1TiqppPsrfvFFNCFzCShKUYC6UGaqR9vob74hYU7g9DMj0u19aY9/eM+3BM60WpMo1XN0QzqoSV1K7gbTGKssPMd39fK9Xh3RhcOHNwzi6OouSq8S7CD1/cnYVR2dK02pd/f5eCyax702ufk3Xdjt99/p3eeeX8Q95l+QWZ8mhQIERx6o2yWu8+6LaxmvKto2xsMoUmQpF4ozSVE3NYxjBZnSK7RpzSqqV2DcniaTNATNWc4SFpm5HkwVpMtT7wSykXAu3230czq44DCf7aTi7D5u2Isy7uIeby+8+OCC6z39L+mNDjQFzVa0q4ns+fffyX/9hHXHEEUcc8UfwDW0OlrUADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
      },
    }

    const testEnv = {
      GLOBAL_MIGRATION_ENV_VARIABLE_ONE: "global_migration_env_value_one",
    }

    let loadedPlan

    before(async () =>
      setEnv(testEnv).then(async () => (loadedPlan = await loadFirstTestPlan(dockerDeployerMetadata, {})))
    )
    after(() => clearEnv(testEnv))

    it("should specify -e parameter", () => {
      expect(loadedPlan.dockerParameters[4]).to.equal("-e")
    })

    it("should expand env variable in call do docker", () => {
      expect(loadedPlan.dockerParameters[5]).to.equal("MIGRATION_ENV_VARIABLE_ONE=global_migration_env_value_one")
    })
  })

  describe("is.icelandairlabs backwards compatibility", function() {
    const dockerImageMetadata = {
      imageDefinition: {
        herdKey: "testimage",
        image: "testenvimage-migrations",
        imagetag: "1.2.3",
      },
      dockerLabels: {
        "is.icelandairlabs.builddate": "Tue 26 Dec 14:52:54 GMT 2017",
        "is.icelandairlabs.deployer": "true",
        "is.icelandairlabs.deployer.environment": "THIS_IS_DEPLOYER_ONE=true",
        "is.icelandairlabs.environment.variables": "",
        "is.icelandairlabs.git.branch": "master",
        "is.icelandairlabs.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
        "is.icelandairlabs.git.url": "https://github.com/Icelandair/is.icelandairlabs.git",
        "is.icelandairlabs.lastcommits":
          "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
        "is.icelandairlabs.name": "TestimageFromIcelandairlabs",
        "is.icelandairlabs.version": "0.1.2",
      },
    }

    let firstPlan

    before(async function() {
      return (firstPlan = await loadFirstTestPlan(dockerImageMetadata, {}))
    })

    it("should rewrite docker labels starting with is.icelandairlabs to labels starting with shepherd", () => {
      expect(firstPlan.displayName).to.equal("TestimageFromIcelandairlabs")
      expect(firstPlan.command).to.equal("deploy")
    })
  })

  describe("k8s deployment using base64 tar", function() {
    const dockerImageMetadata = {
      imageDefinition: {
        herdKey: "testimage",
        image: "testenvimage-migrations",
        imagetag: "0.0.0",
      },
      dockerLabels: {
        "shepherd.builddate": "Tue 26 Dec 14:52:54 GMT 2017",
        "shepherd.dbmigration": "testenvimage-migrations:0.0.0",
        "shepherd.git.branch": "master",
        "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
        "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
        "shepherd.kube.config.tar.base64":
          "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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
        "shepherd.lastcommits":
          "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
        "shepherd.name": "Testimage",
        "shepherd.version": "0.0.0",
      },
    }

    describe("successful load", function() {
      let loadedPlans, planNumberOne
      let testEnv = {
        EXPORT1: "na",
        SUB_DOMAIN_PREFIX: "na",
        PREFIXED_TOP_DOMAIN_NAME: "na",
        WWW_ICELANDAIR_IP_WHITELIST: "YnVsbHNoaXRsaXN0Cg==",
      }

      before(async function() {
        return (planNumberOne = await setEnv(testEnv).then(() =>
          loadTestPlans(dockerImageMetadata, {}).then(plans => {
            loadedPlans = plans
            return plans[0]
          })
        ))
      })

      after(() => clearEnv(testEnv))

      it("should expand handlebars template", () => {
        const configMapPlan = loadedPlans.find(plan => {
          return plan.identifier === "ConfigMap_www-icelandair-com-nginx-acls"
        })

        expect(configMapPlan.descriptor).not.to.contain("WWW_ICELANDAIR_IP_WHITELIST")
        expect(configMapPlan.descriptor).to.contain("bullshitlist")
      })

      it("should have loaded plan", function() {
        expect(planNumberOne).not.to.equal(undefined)
      })

      it("should have version", function() {
        expect(planNumberOne.version).to.equal("0.0.0")
      })

      it("should contain origin in plan", function() {
        expect(planNumberOne.origin).to.equal("testenvimage-migrations:0.0.0:kube.config.tar.base64")
      })

      it("should use apply as default operation", function() {
        expect(planNumberOne.operation).to.equal("apply")
      })

      it("should return one plan per deployment file", function() {
        expect(loadedPlans.length).to.equal(4)
      })

      it("should be of type k8s", function() {
        expect(planNumberOne.type).to.equal("k8s")
      })
    })

    describe("missing env variable", function() {
      let loadError
      before(function() {
        delete process.env.EXPORT1
        return loadTestPlans(dockerImageMetadata, {})
          .then(function() {
            expect.fail("Not expected to succeed!")
          })
          .catch(function(error) {
            loadError = error
          })
      })

      it("should report filename in error", function() {
        expect(loadError.message).to.contain("./deployment/www-icelandair-com.deployment.yml")
      })

      it("should report origin in error", function() {
        expect(loadError.message).to.contain("testenvimage-migrations")
      })

      it("should report start of file in error", function() {
        expect(loadError.message).to.contain("name: www-icelandair-com")
        expect(loadError.message).to.contain("file starting with")
      })

      it("should report variable in error", function() {
        expect(loadError.message).to.contain('"EXPORT1" not defined')
      })
    })
  })

  describe("herd.yaml- feature - deployment to k8s using base64 tar", function() {
    const dockerImageMetadata = {
      imageDefinition: {
        herdKey: "thisIsFeatureDeploymentOne",
        image: "testenvimage-migrations",
        imagetag: "0.0.0",
        featureDeployment: true,
        timeToLiveHours: 48,
      },
      dockerLabels: {
        "shepherd.builddate": "Tue 26 Dec 14:52:54 GMT 2017",
        "shepherd.dbmigration": "testenvimage-migrations:0.0.0",
        "shepherd.git.branch": "master",
        "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
        "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
        "shepherd.kube.config.tar.base64":
          "H4sIAEZiQloAA+1XTXPiOBDlzK9QpXLaKoFtDEz5RhLPrmvCRwEzmRsl7A5Rxba8sgyhsvnvK9t8\nGBsCSSbJTq3fBSy1XkvqVuupVncgcNnSA1/UK+8DRaLdbsa/arupZn/XqKgNTW21G0qrqVcUVdM1\npYKa7zSfHUShIByhyixyXfqM3bH+3xS1bPwXiwWmNrjEdwjl2GZebdtbW3ru63zEAW619EPxbzR0\nbTf+mqqozQpSfu1S9+N/Hn8S0B/AQ8p8A8GDAD/+G9bn6hQEUav31HcMdLVJgqonmx0iiFFFyCce\nGKiYNLLLJVNww9joWTOEBAVuoFvOfOnbqYYB2PEoLj1Sm4QG0uSXAC9wiYCULzuFGFlfR/3t8Rk3\nrf3GoB6ZwUCGewQ2B5Fhxituh9n3wDGHGQ0FX+JAGuMwsV7Z2pKbUF/ubHZ0wmyg88fx4Hpy1b/8\nZg4nVrfzp/m0MTph+vHuhCziNmTIk42gHhW5NjmVIDKQUvuSa/bAY3xpoKaqdXe6OPwdQXiQRz/A\nozVbWZ6A8TwF3u7KQPYa6Iua40qXfidEgAPOHpa5btkmmM1cA40vB89T63p+nlvu8EXkc+ZGHnRZ\n5BfXk3JuwyQzMcQ2yJXnyDkQp++7cpsEjyC/gzH3gIg7A53Vk9H1XcqzvW79GfUfMLHd1zsDYdcT\nmnpMU8/6AX++f7XD772x1TUnZu+HNez3umZvnHMxJ24EXznz8hmUHItbOuuS4Bssh3BbNFjH6fzR\n/DnoD8fq0x6Te5Brk/6LJyt7piaj0fCEY4XDkL/xaLU+7mil2binJB1JwrQ47fpN23rJ8PgSxHkO\nuTkxD72VlVhAweXeBNxEeNfXwd0/kMVUlvzCNuE08os72evKyltIjSDJ601/LZ5M9bNv2P82jum/\nEPhcNr1e/FWO6j9Nfub0n6JJ81L/fQCy+m++1nujNOinij3i+0wQEQtHA6VyapU1sYis3UdT4D4I\nCGuU1ckixC4jDp4SySLrS3ob4+39e/bH2UsUZBhNHebJuz++NUbfL6Sw6nas3mQwNL9aP5/iKaRK\nkwVbu7TTvJqM+4P1gF6nuxJiAognBaJLg40gFctATuFaTvxiNe9qRuTg5K9UNEo6nvAZiB2Rk5c2\nm/VmRut6ozB8LWQK8iVLEIILtmD85XobY1z91SlQZsDvlAGfXYBKfCqO3P+YyizhPnHfIgSO3P9K\nQ2/m7n9NVdrl/f8ReHPx32TIiRV7a78urIUaqsZJkat5ZY17HxzT/+l77k3y/+j5l+/bvP5XlUZ5\n/j8Ce8//5foRf1oF2HnDZ2tARkWtSTaPcwP9gxOj88cLEkJLvwKbOWDc3NxMrEvzutO76ljDiTWY\n3Pxljc1razR+Kg9yiRIlSpQoUaJEiRIlSrwa/wJ4qk95ACgAAA==",
        "shepherd.lastcommits":
          "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
        "shepherd.name": "Testimage",
        "shepherd.version": "0.0.0",
      },
    }

    describe("successful load", function() {
      let planNumberOne
      let testEnv = {
        EXPORT1: "na",
        SUB_DOMAIN_PREFIX: "na",
        PREFIXED_TOP_DOMAIN_NAME: "na",
        WWW_ICELANDAIR_IP_WHITELIST: "YnVsbHNoaXRsaXN0Cg==",
      }
      before(async function() {
        return (planNumberOne = await setEnv(testEnv).then(() => loadFirstTestPlan(dockerImageMetadata, {})))
      })

      after(() => clearEnv(testEnv))

      it("should have feature deployment in origin", function() {
        expect(planNumberOne.origin).to.contain("thisIsFeatureDeploymentOne")
      })

      it("should modify deployment descriptor", function() {
        expect(planNumberOne.descriptor).to.contain("thisisfeaturedeploymentone")
      })

      it("should modify deployment identifier ", function() {
        expect(planNumberOne.identifier).to.equal("Deployment_www-icelandair-com-thisisfeaturedeploymentone")
      })
    })

    describe("missing env variable", function() {
      let loadError
      before(async function() {
        delete process.env.EXPORT1
        return (loadError = await loadTestPlans(dockerImageMetadata, {}).catch(function(error) {
          return error
        }))
      })

      it("should report filename in error", function() {
        expect(loadError.message).to.contain("./deployment/www-icelandair-com.deployment.yml")
      })

      it("should report origin in error", function() {
        expect(loadError.message).to.contain("testenvimage-migrations")
      })

      it("should report line in error", function() {
        expect(loadError.message).to.contain("line ")
      })

      it("should report variable in error", function() {
        expect(loadError.message).to.contain("${EXPORT1}")
      })
    })

    describe("missing env variable for base64 decoding", function() {
      let loadError
      before(async function() {
        process.env.EXPORT1 = "qwerty"
        process.env.SUB_DOMAIN_PREFIX = "qwerty"
        process.env.PREFIXED_TOP_DOMAIN_NAME = "qwerty"
        delete process.env.WWW_ICELANDAIR_IP_WHITELIST
        return (loadError = await loadTestPlans(dockerImageMetadata, {}).catch(function(error) {
          return error
        }))
      })

      it("should report filename in error", function() {
        expect(loadError.message).to.contain("/deployment/www-icelandair-com.config.yml")
      })

      it("should report origin in error", function() {
        expect(loadError.message).to.contain("testenvimage")
      })

      it("should report line number in error", function() {
        expect(loadError.message).to.contain("line #8")
      })

      it("should report missing base64 encoded variable in error", function() {
        expect(loadError.message).to.contain("WWW_ICELANDAIR_IP_WHITELIST")
      })
    })
  })

  describe("triggered feature - deployment to k8s using base64 tar", function() {
    const dockerImageMetadata = {
      imageDefinition: {
        herdKey: "regular-deployment",
        image: "testenvimage-migrations",
        imagetag: "0.0.0",
      },
      dockerLabels: {
        "shepherd.builddate": "Tue 26 Dec 14:52:54 GMT 2017",
        "shepherd.dbmigration": "testenvimage-migrations:0.0.0",
        "shepherd.git.branch": "master",
        "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
        "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
        "shepherd.kube.config.tar.base64":
          "H4sIAEZiQloAA+1XTXPiOBDlzK9QpXLaKoFtDEz5RhLPrmvCRwEzmRsl7A5Rxba8sgyhsvnvK9t8\nGBsCSSbJTq3fBSy1XkvqVuupVncgcNnSA1/UK+8DRaLdbsa/arupZn/XqKgNTW21G0qrqVcUVdM1\npYKa7zSfHUShIByhyixyXfqM3bH+3xS1bPwXiwWmNrjEdwjl2GZebdtbW3ru63zEAW619EPxbzR0\nbTf+mqqozQpSfu1S9+N/Hn8S0B/AQ8p8A8GDAD/+G9bn6hQEUav31HcMdLVJgqonmx0iiFFFyCce\nGKiYNLLLJVNww9joWTOEBAVuoFvOfOnbqYYB2PEoLj1Sm4QG0uSXAC9wiYCULzuFGFlfR/3t8Rk3\nrf3GoB6ZwUCGewQ2B5Fhxituh9n3wDGHGQ0FX+JAGuMwsV7Z2pKbUF/ubHZ0wmyg88fx4Hpy1b/8\nZg4nVrfzp/m0MTph+vHuhCziNmTIk42gHhW5NjmVIDKQUvuSa/bAY3xpoKaqdXe6OPwdQXiQRz/A\nozVbWZ6A8TwF3u7KQPYa6Iua40qXfidEgAPOHpa5btkmmM1cA40vB89T63p+nlvu8EXkc+ZGHnRZ\n5BfXk3JuwyQzMcQ2yJXnyDkQp++7cpsEjyC/gzH3gIg7A53Vk9H1XcqzvW79GfUfMLHd1zsDYdcT\nmnpMU8/6AX++f7XD772x1TUnZu+HNez3umZvnHMxJ24EXznz8hmUHItbOuuS4Bssh3BbNFjH6fzR\n/DnoD8fq0x6Te5Brk/6LJyt7piaj0fCEY4XDkL/xaLU+7mil2binJB1JwrQ47fpN23rJ8PgSxHkO\nuTkxD72VlVhAweXeBNxEeNfXwd0/kMVUlvzCNuE08os72evKyltIjSDJ601/LZ5M9bNv2P82jum/\nEPhcNr1e/FWO6j9Nfub0n6JJ81L/fQCy+m++1nujNOinij3i+0wQEQtHA6VyapU1sYis3UdT4D4I\nCGuU1ckixC4jDp4SySLrS3ob4+39e/bH2UsUZBhNHebJuz++NUbfL6Sw6nas3mQwNL9aP5/iKaRK\nkwVbu7TTvJqM+4P1gF6nuxJiAognBaJLg40gFctATuFaTvxiNe9qRuTg5K9UNEo6nvAZiB2Rk5c2\nm/VmRut6ozB8LWQK8iVLEIILtmD85XobY1z91SlQZsDvlAGfXYBKfCqO3P+YyizhPnHfIgSO3P9K\nQ2/m7n9NVdrl/f8ReHPx32TIiRV7a78urIUaqsZJkat5ZY17HxzT/+l77k3y/+j5l+/bvP5XlUZ5\n/j8Ce8//5foRf1oF2HnDZ2tARkWtSTaPcwP9gxOj88cLEkJLvwKbOWDc3NxMrEvzutO76ljDiTWY\n3Pxljc1razR+Kg9yiRIlSpQoUaJEiRIlSrwa/wJ4qk95ACgAAA==",
        "shepherd.lastcommits":
          "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
        "shepherd.name": "Testimage",
        "shepherd.version": "0.0.0",
      },
    }

    describe("triggered successful load", function() {
      let planNumberOne

      let testEnv = {
        EXPORT1: "na",
        SUB_DOMAIN_PREFIX: "na",
        PREFIXED_TOP_DOMAIN_NAME: "na",
        WWW_ICELANDAIR_IP_WHITELIST: "YnVsbHNoaXRsaXN0Cg==",
      }

      before(async function() {
        const featureDeploymentConfig = {
          upstreamFeatureDeployment: true,
          upstreamHerdKey: "regular-deployment",
          newName: "on-branch-one",
          ttlHours: 888,
        }
        return (planNumberOne = await setEnv(testEnv).then(() =>
          loadFirstTestPlan(dockerImageMetadata, featureDeploymentConfig)
        ))
      })

      after(() => clearEnv(testEnv))

      it("should have triggered feature deployment in origin", function() {
        expect(planNumberOne.origin).to.contain("regular-deployment::on-branch-one")
      })

      it("should modify triggered deployment descriptor", function() {
        expect(planNumberOne.descriptor).to.contain("www-icelandair-com-on-branch-one")
      })

      it("should modify triggered deployment identifier ", function() {
        expect(planNumberOne.identifier).to.equal("Deployment_www-icelandair-com-on-branch-one")
      })
    })

    describe("feature deployment to k8s using base64 tar ", function() {
      const dockerImageMetadata = {
        imageDefinition: {
          herdKey: "regular-deployment",
          image: "testenvimage-migrations",
          imagetag: "0.0.0",
        },
        dockerLabels: {
          "shepherd.builddate": "Tue 26 Dec 14:52:54 GMT 2017",
          "shepherd.dbmigration": "testenvimage-migrations:0.0.0",
          "shepherd.git.branch": "master",
          "shepherd.git.hash": "b14892def916aa1fffa9728a5d58f7359f982c02",
          "shepherd.git.url": "https://github.com/Icelandair/shepherd.git",
          "shepherd.kube.config.tar.base64":
            "H4sIAEZiQloAA+1XTXPiOBDlzK9QpXLaKoFtDEz5RhLPrmvCRwEzmRsl7A5Rxba8sgyhsvnvK9t8\nGBsCSSbJTq3fBSy1XkvqVuupVncgcNnSA1/UK+8DRaLdbsa/arupZn/XqKgNTW21G0qrqVcUVdM1\npYKa7zSfHUShIByhyixyXfqM3bH+3xS1bPwXiwWmNrjEdwjl2GZebdtbW3ru63zEAW619EPxbzR0\nbTf+mqqozQpSfu1S9+N/Hn8S0B/AQ8p8A8GDAD/+G9bn6hQEUav31HcMdLVJgqonmx0iiFFFyCce\nGKiYNLLLJVNww9joWTOEBAVuoFvOfOnbqYYB2PEoLj1Sm4QG0uSXAC9wiYCULzuFGFlfR/3t8Rk3\nrf3GoB6ZwUCGewQ2B5Fhxituh9n3wDGHGQ0FX+JAGuMwsV7Z2pKbUF/ubHZ0wmyg88fx4Hpy1b/8\nZg4nVrfzp/m0MTph+vHuhCziNmTIk42gHhW5NjmVIDKQUvuSa/bAY3xpoKaqdXe6OPwdQXiQRz/A\nozVbWZ6A8TwF3u7KQPYa6Iua40qXfidEgAPOHpa5btkmmM1cA40vB89T63p+nlvu8EXkc+ZGHnRZ\n5BfXk3JuwyQzMcQ2yJXnyDkQp++7cpsEjyC/gzH3gIg7A53Vk9H1XcqzvW79GfUfMLHd1zsDYdcT\nmnpMU8/6AX++f7XD772x1TUnZu+HNez3umZvnHMxJ24EXznz8hmUHItbOuuS4Bssh3BbNFjH6fzR\n/DnoD8fq0x6Te5Brk/6LJyt7piaj0fCEY4XDkL/xaLU+7mil2binJB1JwrQ47fpN23rJ8PgSxHkO\nuTkxD72VlVhAweXeBNxEeNfXwd0/kMVUlvzCNuE08os72evKyltIjSDJ601/LZ5M9bNv2P82jum/\nEPhcNr1e/FWO6j9Nfub0n6JJ81L/fQCy+m++1nujNOinij3i+0wQEQtHA6VyapU1sYis3UdT4D4I\nCGuU1ckixC4jDp4SySLrS3ob4+39e/bH2UsUZBhNHebJuz++NUbfL6Sw6nas3mQwNL9aP5/iKaRK\nkwVbu7TTvJqM+4P1gF6nuxJiAognBaJLg40gFctATuFaTvxiNe9qRuTg5K9UNEo6nvAZiB2Rk5c2\nm/VmRut6ozB8LWQK8iVLEIILtmD85XobY1z91SlQZsDvlAGfXYBKfCqO3P+YyizhPnHfIgSO3P9K\nQ2/m7n9NVdrl/f8ReHPx32TIiRV7a78urIUaqsZJkat5ZY17HxzT/+l77k3y/+j5l+/bvP5XlUZ5\n/j8Ce8//5foRf1oF2HnDZ2tARkWtSTaPcwP9gxOj88cLEkJLvwKbOWDc3NxMrEvzutO76ljDiTWY\n3Pxljc1razR+Kg9yiRIlSpQoUaJEiRIlSrwa/wJ4qk95ACgAAA==",
          "shepherd.lastcommits":
            "VGh1LCAyMSBEZWMgMjAxNyAxMDo0NTo0NSArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29u\nLiAtLS0gQmV0dGVyIHVzZSByaWdodCBtYWtlIHRhcmdldCBXZWQsIDIwIERlYyAyMDE3IDE4OjE1\nOjUwICswMDAwIGJ5IEd1w7BsYXVndXIgUy4gRWdpbHNzb24uIC0tLSBBIGxpdHRsZSB0cmlja2Vy\neSB0byBtYWtlIGphc21pbmUgcnVubmFibGUgd2l0aCBzcmMgZGlyIG1hcHBlZCBpbiBkb2NrZXIt\nY29tcG9zZS4gV2VkLCAyMCBEZWMgMjAxNyAxNzoxMDozOCArMDAwMCBieSBHdcOwbGF1Z3VyIFMu\nIEVnaWxzc29uLiAtLS0gSmVua2lucyBqb2IgY2Fubm90IHVzZSAtaXQgV2VkLCAyMCBEZWMgMjAx\nNyAxNjo1OToxMyArMDAwMCBieSBHdcOwbGF1Z3VyIFMuIEVnaWxzc29uLiAtLS0gQWxsIHRlc3Rz\nIG5vdyBydW5uaW5nIGluIGRvY2tlciBpbWFnZXMuIEFkZGVkIEplbmtpbnNmaWxlLiBQbHVzIGxv\ndHMgb2Ygc21hbGxlciBpbXByb3ZlbWVudHMvY2hhbmdlcy4gV2VkLCAyMCBEZWMgMjAxNyAwOToz\nMToxMCArMDAwMCBieSBHdcOwbGF1Z3VyIEVnaWxzc29uIEBndWxsaS4gLS0tIFJlc29sdmUgdG9k\nbywgZXhpdCB3aXRoIGVycm9yIGlmIGltYWdlIHNwZWNpZmllZCBpcyBub3QgYWN0aW9uYWJsZS4K",
          "shepherd.name": "Testimage",
          "shepherd.version": "0.0.0",
        },
      }
      const testEnv = {
        EXPORT1: "na",
        SUB_DOMAIN_PREFIX: "na",
        PREFIXED_TOP_DOMAIN_NAME: "na",
        WWW_ICELANDAIR_IP_WHITELIST: "YnVsbHNoaXRsaXN0Cg==",
      }
      const featureDeploymentConfig = {
        upstreamFeatureDeployment: true,
        upstreamHerdKey: "regular-deployment",
        newName: "on-branch-one",
        ttlHours: "99",
      }

      let planOne

      before(async function() {
        return (planOne = await setEnv(testEnv).then(() =>
          loadFirstTestPlan(dockerImageMetadata, featureDeploymentConfig)
        ))
      })

      after(() => clearEnv(testEnv))

      it("should have feature deployment in origin", function() {
        expect(planOne.origin).to.contain("regular-deployment::on-branch-one")
      })

      it("should modify deployment descriptor", function() {
        expect(planOne.descriptor).to.contain("www-icelandair-com-on-branch-one")
      })

      it("should modify deployment identifier ", function() {
        expect(planOne.identifier).to.equal("Deployment_www-icelandair-com-on-branch-one")
      })

      it("should modify configmap identifier ", function() {
        expect(planOne.descriptor).to.contain("www-icelandair-com-on-branch-one")
      })

      it("should modify configmap references ", function() {
        expect(planOne.descriptor).to.contain("www-icelandair-com-nginx-acls-on-branch-one")
      })

      it("should set time to live", () => {
        expect(planOne.descriptor).to.contain(" ttl-hours:")
      })

      it("should set time to live as quoted value", () => {
        expect(planOne.descriptor).to.contain(" ttl-hours: '99'")
      })
    })
  })

  describe("with invalid base64 tar archive", function() {
    xit("should give meaningful message if base64tar archive is not legal", function() {})

    xit("should give meaningful message if file in archive is binary", function() {})
  })
})
