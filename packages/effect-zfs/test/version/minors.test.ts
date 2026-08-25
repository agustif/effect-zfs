import { assert, describe, it } from "@effect/vitest"
import { OperationShapes } from "../../src/generated/operations.generated.js"
import { DatasetProperty } from "../../src/generated/properties.generated.js"
import { linuxReleases } from "../../src/generated/releases.generated.js"
import {
  featuresFor,
  linux,
  parseZfsVersionLine,
  propertyAvailable,
  releaseFor,
  supportsJsonStatus
} from "../../src/schema/version.js"

describe("linux OpenZFS minors", () => {
  it("catalogues every 2.2.2–2.4.4 patch", () => {
    assert.strictEqual(linuxReleases.length, 25)
    assert.strictEqual(linuxReleases[0]?.tag, "zfs-2.2.2")
    assert.strictEqual(linuxReleases[linuxReleases.length - 1]?.tag, "zfs-2.4.4")
    assert.ok(linux.v2_2_11.patch === 11)
    assert.ok(linux.v2_3_9.patch === 9)
    assert.ok(linux.v2_4_4.patch === 4)
  })

  for (const release of linuxReleases) {
    it(`types ${release.tag}`, () => {
      const version = parseZfsVersionLine(release.tag)
      assert.strictEqual(version.major, release.major)
      assert.strictEqual(version.minor, release.minor)
      assert.strictEqual(version.patch, release.patch)
      const features = featuresFor(version)
      assert.strictEqual(features.jsonStatus, release.features.jsonStatus)
      assert.strictEqual(features.jsonVersion, release.features.jsonVersion)
      assert.strictEqual(features.datasetPrefetchProp, release.features.datasetPrefetchProp)
      assert.strictEqual(features.directIO, release.features.directIO)
      assert.strictEqual(features.longNames, release.features.longNames)
      assert.strictEqual(features.fastDedup, release.features.fastDedup)
      assert.strictEqual(features.raidzExpansion, release.features.raidzExpansion)
      assert.strictEqual(features.allPoolsOps, release.features.allPoolsOps)
      assert.strictEqual(features.scrubTimeRange, release.features.scrubTimeRange)
      assert.strictEqual(features.rewritePreserve, release.features.rewritePreserve)
      assert.strictEqual(features.prefetchBrt, release.features.prefetchBrt)
      assert.strictEqual(features.defaultQuotas, release.features.defaultQuotas)
      assert.strictEqual(releaseFor(version).tag, release.tag)
    })
  }

  it("gates JSON status at 2.3.0 and all-pool ops at 2.4.0", () => {
    assert.isFalse(supportsJsonStatus(parseZfsVersionLine("zfs-2.2.11")))
    assert.isTrue(supportsJsonStatus(parseZfsVersionLine("zfs-2.3.0")))
    assert.isFalse(featuresFor(linux.v2_3_9).allPoolsOps)
    assert.isTrue(featuresFor(linux.v2_4_0).allPoolsOps)
    assert.isTrue(featuresFor(linux.v2_4_4).prefetchBrt)
  })

  it("gates generated properties by since", () => {
    assert.isFalse(propertyAvailable(linux.v2_2_2, DatasetProperty.prefetch.since))
    assert.isTrue(propertyAvailable(linux.v2_2_4, DatasetProperty.prefetch.since))
    assert.isFalse(propertyAvailable(linux.v2_2_11, DatasetProperty.direct.since))
    assert.isTrue(propertyAvailable(linux.v2_3_0, DatasetProperty.direct.since))
    assert.isTrue(propertyAvailable(linux.v2_3_0, DatasetProperty.longname.since))
    assert.isFalse(propertyAvailable(linux.v2_3_9, DatasetProperty.defaultuserquota.since))
    assert.isTrue(propertyAvailable(linux.v2_4_0, DatasetProperty.defaultuserquota.since))
  })

  it("attaches Smithy input/output to every protocol op", () => {
    assert.strictEqual(OperationShapes["Dataset.CreateFilesystem"].input, "CreateFilesystem")
    assert.strictEqual(OperationShapes["Pool.Scrub"].input, "Scrub")
    assert.strictEqual(OperationShapes["Zfs.Version"].output, "ZfsVersionInfo")
    assert.strictEqual(OperationShapes["Dataset.Rewrite"].input, "Rewrite")
    assert.strictEqual(OperationShapes["Dataset.Rewrite"].since, "2.3.0")
    assert.strictEqual(OperationShapes["Pool.Freeze"].input, "FreezePool")
    assert.strictEqual(OperationShapes["Pool.ErrorLog"].output, "ReadonlyArray<ErrorLogRow>")
    assert.strictEqual(Object.keys(OperationShapes).length, 105)
  })
})
