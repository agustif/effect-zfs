import { Schema } from "effect"

/**
 * OpenZFS numeric and name limits from `sys/fs/zfs.h` / `zfs_namecheck.c`.
 * These are the supported-range constants for Linux ZFS 2.2.2+.
 */

/** `ZFS_MAX_DATASET_NAME_LEN` includes the terminating NUL. */
export const maxDatasetNameLen = 256
export const maxDatasetNameBytes = maxDatasetNameLen - 1

/** `zfs_max_dataset_nesting` default. Depth is slash count; must be `<` this. */
export const maxDatasetNesting = 50

/**
 * Pool names reserve space for `/$ORIGIN@$ORIGIN` (`ORIGIN_DIR_NAME` is 7).
 * `strlen(pool) >= ZFS_MAX_DATASET_NAME_LEN - 2 - 14` fails.
 */
export const maxPoolNameBytes = maxDatasetNameLen - 2 - 7 * 2 - 1

/** `SPA_MINBLOCKSHIFT` */
export const spaMinBlockShift = 9
/** `SPA_MAXBLOCKSHIFT` (16 MiB). */
export const spaMaxBlockShift = 24
/** `SPA_OLD_MAXBLOCKSHIFT` (128 KiB). */
export const spaOldMaxBlockShift = 17

export const spaMinBlockSize = 1n << BigInt(spaMinBlockShift)
export const spaMaxBlockSize = 1n << BigInt(spaMaxBlockShift)
export const spaOldMaxBlockSize = 1n << BigInt(spaOldMaxBlockShift)

/** `SPA_MINDEVSIZE` (64 MiB). Linux ZFS 2.2.2+ refuses smaller vdevs. */
export const spaMinDevSizeBytes = 64n << 20n

/** Linux `PATH_MAX` minus the terminating NUL. Leaf vdev paths and identifiers. */
export const maxPathBytes = 4095

export const uInt64Max = (1n << 64n) - 1n

export const reservedPoolNames = ["mirror", "raidz", "draid"] as const
export const ReservedPoolName = Schema.Literals(reservedPoolNames)
export type ReservedPoolName = typeof ReservedPoolName.Type

export const kib = (n: number | bigint): bigint => BigInt(n) << 10n
export const mib = (n: number | bigint): bigint => BigInt(n) << 20n
export const gib = (n: number | bigint): bigint => BigInt(n) << 30n

const minMaxBigint = (min: bigint, max: bigint, title: string, unit: string) =>
  Schema.makeFilter((n: bigint) => {
    if (n < min) return `${title} smaller than ${min} ${unit}`
    if (n > max) return `${title} larger than ${max} ${unit}`
    return undefined
  }, { title })

/** Non-negative uint64 byte count (list size/free, used, …). */
export const ByteCount = Schema.BigInt.pipe(
  Schema.check(minMaxBigint(0n, uInt64Max, "ByteCount", "bytes")),
  Schema.brand("ByteCount")
)
export type ByteCount = typeof ByteCount.Type
export const byteCount = Schema.decodeUnknownSync(ByteCount)

/** zvol size. Floor is `SPA_MINBLOCKSIZE` (512). */
export const VolumeSize = Schema.BigInt.pipe(
  Schema.check(minMaxBigint(spaMinBlockSize, uInt64Max, "VolumeSize", "bytes")),
  Schema.brand("VolumeSize")
)
export type VolumeSize = typeof VolumeSize.Type
export const volumeSize = Schema.decodeUnknownSync(VolumeSize)

/** Leaf vdev / file-backed disk. Floor is `SPA_MINDEVSIZE` (64 MiB). */
export const VdevSize = Schema.BigInt.pipe(
  Schema.check(minMaxBigint(spaMinDevSizeBytes, uInt64Max, "VdevSize", "bytes")),
  Schema.brand("VdevSize")
)
export type VdevSize = typeof VdevSize.Type
export const vdevSize = Schema.decodeUnknownSync(VdevSize)

export const spaMinDevSize = vdevSize(spaMinDevSizeBytes)

/** `ZFS_PERMSET_MAXLEN`. `permset_namecheck` rejects `strlen >=` this. */
export const maxPermsetNameLen = 64
export const maxPermsetNameBytes = maxPermsetNameLen - 1

/**
 * `zfsxattr::fsx_projid` is 32-bit. OpenZFS rejects `>= UINT32_MAX`
 * (`ZFS_INVALID_PROJID`).
 */
export const maxProjectId = (1n << 32n) - 2n
export const defaultProjectId = 0n

export const ProjectId = Schema.BigInt.pipe(
  Schema.check(minMaxBigint(0n, maxProjectId, "ProjectId", "")),
  Schema.brand("ProjectId")
)
export type ProjectId = typeof ProjectId.Type
export const projectId = Schema.decodeUnknownSync(ProjectId)

/** `WRAPPING_KEY_LEN` (`zio_crypt.h`). Raw/hex wrapping keys are 32 bytes. */
export const wrappingKeyLen = 32

/** OpenZFS passphrase floor (8 characters). */
export const minPassphraseLen = 8

/** `MIN_PBKDF2_ITERATIONS`. */
export const minPbkdf2Iterations = 100000n

/** `DEFAULT_PBKDF2_ITERATIONS`. */
export const defaultPbkdf2Iterations = 350000n

/** Last legacy on-disk version (`SPA_VERSION_BEFORE_FEATURES`). */
export const spaLegacyMaxVersion = 28
/** Feature-flag pool version (`SPA_VERSION_FEATURES`). */
export const spaVersionFeatures = 5000

/** Last ZPL on-disk version (`ZPL_VERSION` / `ZPL_VERSION_5`). */
export const zplVersionMax = 5

/** `zfs upgrade -V` argument: filesystem versions 1–5. */
export const DatasetVersion = Schema.Int.pipe(
  Schema.check(Schema.makeFilter((n: number) => {
    if (n >= 1 && n <= zplVersionMax) return undefined
    return `dataset version must be 1-${zplVersionMax}`
  }, { title: "DatasetVersion" })),
  Schema.brand("DatasetVersion")
)
export type DatasetVersion = typeof DatasetVersion.Type
export const datasetVersion = Schema.decodeUnknownSync(DatasetVersion)

/**
 * `zfs create -b` / `volblocksize`. Power of two in
 * `[SPA_MINBLOCKSIZE, SPA_MAXBLOCKSIZE]`.
 */
export const VolBlockSize = Schema.BigInt.pipe(
  Schema.check(Schema.makeFilter((n: bigint) => {
    if (n < spaMinBlockSize) return `volblocksize smaller than ${spaMinBlockSize} bytes`
    if (n > spaMaxBlockSize) return `volblocksize larger than ${spaMaxBlockSize} bytes`
    if ((n & (n - 1n)) !== 0n) return "volblocksize must be a power of two"
    return undefined
  }, { title: "VolBlockSize" })),
  Schema.brand("VolBlockSize")
)
export type VolBlockSize = typeof VolBlockSize.Type
export const volBlockSize = Schema.decodeUnknownSync(VolBlockSize)

/** `zpool upgrade -V` argument: legacy 1–28 or feature version 5000. */
export const PoolVersion = Schema.Int.pipe(
  Schema.check(Schema.makeFilter((n: number) => {
    if ((n >= 1 && n <= spaLegacyMaxVersion) || n === spaVersionFeatures) return undefined
    return `pool version must be 1-${spaLegacyMaxVersion} or ${spaVersionFeatures}`
  }, { title: "PoolVersion" })),
  Schema.brand("PoolVersion")
)
export type PoolVersion = typeof PoolVersion.Type
export const poolVersion = Schema.decodeUnknownSync(PoolVersion)

/** Pool GUID (`uint64`, never zero). */
export const PoolGuid = Schema.BigInt.pipe(
  Schema.check(minMaxBigint(1n, uInt64Max, "PoolGuid", "guid")),
  Schema.brand("PoolGuid")
)
export type PoolGuid = typeof PoolGuid.Type
export const poolGuid = Schema.decodeUnknownSync(PoolGuid)
