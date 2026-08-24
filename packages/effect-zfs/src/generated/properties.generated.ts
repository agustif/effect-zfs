// AUTO-GENERATED. DO NOT EDIT.
import { defineProperty } from "../Property.js"

export const DatasetProperty = {
  redundantMetadata: defineProperty<"redundant_metadata", "all" | "most" | "some" | "none", "filesystem" | "volume", "inheritable">({
    name: "redundant_metadata", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_REDUNDANT_METADATA_ALL", values: ["all","most","some","none"]
  }),
  sync: defineProperty<"sync", "standard" | "always" | "disabled", "filesystem" | "volume", "inheritable">({
    name: "sync", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_SYNC_STANDARD", values: ["standard","always","disabled"]
  }),
  checksum: defineProperty<"checksum", "on" | "off" | "fletcher2" | "fletcher4" | "sha256" | "noparity" | "sha512" | "skein" | "edonr" | "blake3", "filesystem" | "volume", "inheritable">({
    name: "checksum", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZIO_CHECKSUM_DEFAULT", values: ["on","off","fletcher2","fletcher4","sha256","noparity","sha512","skein","edonr","blake3"]
  }),
  dedup: defineProperty<"dedup", "on" | "off" | "verify" | "sha256" | "sha256,verify" | "sha512" | "sha512,verify" | "skein" | "skein,verify" | "edonr,verify" | "blake3" | "blake3,verify", "filesystem" | "volume", "inheritable">({
    name: "dedup", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZIO_CHECKSUM_OFF", values: ["on","off","verify","sha256","sha256,verify","sha512","sha512,verify","skein","skein,verify","edonr,verify","blake3","blake3,verify"]
  }),
  compression: defineProperty<"compression", "on" | "off" | "lzjb" | "gzip" | "gzip-1" | "gzip-2" | "gzip-3" | "gzip-4" | "gzip-5" | "gzip-6" | "gzip-7" | "gzip-8" | "gzip-9" | "zle" | "lz4" | "zstd" | "zstd-fast" | "zstd-1" | "zstd-2" | "zstd-3" | "zstd-4" | "zstd-5" | "zstd-6" | "zstd-7" | "zstd-8" | "zstd-9" | "zstd-10" | "zstd-11" | "zstd-12" | "zstd-13" | "zstd-14" | "zstd-15" | "zstd-16" | "zstd-17" | "zstd-18" | "zstd-19" | "zstd-fast-1" | "zstd-fast-2" | "zstd-fast-3" | "zstd-fast-4" | "zstd-fast-5" | "zstd-fast-6" | "zstd-fast-7" | "zstd-fast-8" | "zstd-fast-9" | "zstd-fast-10" | "zstd-fast-20" | "zstd-fast-30" | "zstd-fast-40" | "zstd-fast-50" | "zstd-fast-60" | "zstd-fast-70" | "zstd-fast-80" | "zstd-fast-90" | "zstd-fast-100" | "zstd-fast-500" | "zstd-fast-1000", "filesystem" | "volume", "inheritable">({
    name: "compression", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZIO_COMPRESS_DEFAULT", values: ["on","off","lzjb","gzip","gzip-1","gzip-2","gzip-3","gzip-4","gzip-5","gzip-6","gzip-7","gzip-8","gzip-9","zle","lz4","zstd","zstd-fast","zstd-1","zstd-2","zstd-3","zstd-4","zstd-5","zstd-6","zstd-7","zstd-8","zstd-9","zstd-10","zstd-11","zstd-12","zstd-13","zstd-14","zstd-15","zstd-16","zstd-17","zstd-18","zstd-19","zstd-fast-1","zstd-fast-2","zstd-fast-3","zstd-fast-4","zstd-fast-5","zstd-fast-6","zstd-fast-7","zstd-fast-8","zstd-fast-9","zstd-fast-10","zstd-fast-20","zstd-fast-30","zstd-fast-40","zstd-fast-50","zstd-fast-60","zstd-fast-70","zstd-fast-80","zstd-fast-90","zstd-fast-100","zstd-fast-500","zstd-fast-1000"]
  }),
  snapdir: defineProperty<"snapdir", "hidden" | "visible" | "disabled", "filesystem", "inheritable">({
    name: "snapdir", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "enum", default: "ZFS_SNAPDIR_HIDDEN", values: ["hidden","visible","disabled"]
  }),
  snapdev: defineProperty<"snapdev", "hidden" | "visible", "filesystem" | "volume", "inheritable">({
    name: "snapdev", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_SNAPDEV_HIDDEN", values: ["hidden","visible"]
  }),
  aclmode: defineProperty<"aclmode", "discard" | "groupmask" | "passthrough" | "restricted", "filesystem", "inheritable">({
    name: "aclmode", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "enum", default: "ZFS_ACL_DISCARD", values: ["discard","groupmask","passthrough","restricted"]
  }),
  aclinherit: defineProperty<"aclinherit", "discard" | "noallow" | "restricted" | "passthrough" | "secure" | "passthrough-x", "filesystem", "inheritable">({
    name: "aclinherit", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "enum", default: "ZFS_ACL_RESTRICTED", values: ["discard","noallow","restricted","passthrough","secure","passthrough-x"]
  }),
  copies: defineProperty<"copies", "1" | "2" | "3", "filesystem" | "volume", "inheritable">({
    name: "copies", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "1", values: ["1","2","3"]
  }),
  primarycache: defineProperty<"primarycache", "none" | "metadata" | "all", "filesystem" | "volume" | "snapshot", "inheritable">({
    name: "primarycache", scope: "dataset", access: "inheritable", targets: ["filesystem","volume","snapshot"], codec: "enum", default: "ZFS_CACHE_ALL", values: ["none","metadata","all"]
  }),
  secondarycache: defineProperty<"secondarycache", "none" | "metadata" | "all", "filesystem" | "volume" | "snapshot", "inheritable">({
    name: "secondarycache", scope: "dataset", access: "inheritable", targets: ["filesystem","volume","snapshot"], codec: "enum", default: "ZFS_CACHE_ALL", values: ["none","metadata","all"]
  }),
  prefetch: defineProperty<"prefetch", "none" | "metadata" | "all", "filesystem" | "volume" | "snapshot", "inheritable">({
    name: "prefetch", scope: "dataset", access: "inheritable", targets: ["filesystem","volume","snapshot"], codec: "enum", default: "ZFS_PREFETCH_ALL", values: ["none","metadata","all"]
  }),
  logbias: defineProperty<"logbias", "latency" | "throughput", "filesystem" | "volume", "inheritable">({
    name: "logbias", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_LOGBIAS_LATENCY", values: ["latency","throughput"]
  }),
  xattr: defineProperty<"xattr", "off" | "sa" | "on" | "dir", "filesystem" | "snapshot", "inheritable">({
    name: "xattr", scope: "dataset", access: "inheritable", targets: ["filesystem","snapshot"], codec: "enum", default: "ZFS_XATTR_SA", values: ["off","sa","on","dir"]
  }),
  dnodesize: defineProperty<"dnodesize", "legacy" | "auto" | "1k" | "2k" | "4k" | "8k" | "16k", "filesystem", "inheritable">({
    name: "dnodesize", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "enum", default: "ZFS_DNSIZE_LEGACY", values: ["legacy","auto","1k","2k","4k","8k","16k"]
  }),
  volmode: defineProperty<"volmode", "default" | "full" | "geom" | "dev" | "none", "filesystem" | "volume", "inheritable">({
    name: "volmode", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_VOLMODE_DEFAULT", values: ["default","full","geom","dev","none"]
  }),
  direct: defineProperty<"direct", "disabled" | "standard" | "always", "filesystem", "inheritable">({
    name: "direct", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "enum", default: "ZFS_DIRECT_STANDARD", values: ["disabled","standard","always"]
  }),
  atime: defineProperty<"atime", boolean, "filesystem", "inheritable">({
    name: "atime", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "1"
  }),
  devices: defineProperty<"devices", boolean, "filesystem" | "snapshot", "inheritable">({
    name: "devices", scope: "dataset", access: "inheritable", targets: ["filesystem","snapshot"], codec: "boolean", default: "1"
  }),
  exec: defineProperty<"exec", boolean, "filesystem" | "snapshot", "inheritable">({
    name: "exec", scope: "dataset", access: "inheritable", targets: ["filesystem","snapshot"], codec: "boolean", default: "1"
  }),
  setuid: defineProperty<"setuid", boolean, "filesystem" | "snapshot", "inheritable">({
    name: "setuid", scope: "dataset", access: "inheritable", targets: ["filesystem","snapshot"], codec: "boolean", default: "1"
  }),
  readonly: defineProperty<"readonly", boolean, "filesystem" | "volume", "inheritable">({
    name: "readonly", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "boolean", default: "0"
  }),
  jailed: defineProperty<"jailed", boolean, "filesystem", "inheritable">({
    name: "jailed", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "0"
  }),
  zoned: defineProperty<"zoned", boolean, "filesystem", "inheritable">({
    name: "zoned", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "0"
  }),
  zonedUid: defineProperty<"zoned_uid", bigint, "filesystem", "inheritable">({
    name: "zoned_uid", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "bigint", default: "0"
  }),
  vscan: defineProperty<"vscan", boolean, "filesystem", "inheritable">({
    name: "vscan", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "0"
  }),
  nbmand: defineProperty<"nbmand", boolean, "filesystem" | "snapshot", "inheritable">({
    name: "nbmand", scope: "dataset", access: "inheritable", targets: ["filesystem","snapshot"], codec: "boolean", default: "0"
  }),
  overlay: defineProperty<"overlay", boolean, "filesystem", "inheritable">({
    name: "overlay", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "1"
  }),
  version: defineProperty<"version", "1" | "2" | "3" | "4" | "5" | "current", "filesystem" | "snapshot", "mutable">({
    name: "version", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "enum", default: "0", values: ["1","2","3","4","5","current"]
  }),
  canmount: defineProperty<"canmount", "off" | "on" | "noauto", "filesystem", "mutable">({
    name: "canmount", scope: "dataset", access: "mutable", targets: ["filesystem"], codec: "enum", default: "ZFS_CANMOUNT_ON", values: ["off","on","noauto"]
  }),
  mounted: defineProperty<"mounted", boolean, "filesystem", "readonly">({
    name: "mounted", scope: "dataset", access: "readonly", targets: ["filesystem"], codec: "boolean", default: "0"
  }),
  deferDestroy: defineProperty<"defer_destroy", boolean, "snapshot", "readonly">({
    name: "defer_destroy", scope: "dataset", access: "readonly", targets: ["snapshot"], codec: "boolean", default: "0"
  }),
  keystatus: defineProperty<"keystatus", "none" | "unavailable" | "available", "filesystem" | "volume" | "snapshot", "readonly">({
    name: "keystatus", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "enum", default: "ZFS_KEYSTATUS_NONE", values: ["none","unavailable","available"]
  }),
  normalization: defineProperty<"normalization", "none" | "formD" | "formKC" | "formC" | "formKD", "filesystem" | "snapshot", "setOnce">({
    name: "normalization", scope: "dataset", access: "setOnce", targets: ["filesystem","snapshot"], codec: "enum", default: "0", values: ["none","formD","formKC","formC","formKD"]
  }),
  casesensitivity: defineProperty<"casesensitivity", "sensitive" | "insensitive" | "mixed", "filesystem" | "snapshot", "setOnce">({
    name: "casesensitivity", scope: "dataset", access: "setOnce", targets: ["filesystem","snapshot"], codec: "enum", default: "ZFS_CASE_SENSITIVE", values: ["sensitive","insensitive","mixed"]
  }),
  keyformat: defineProperty<"keyformat", "none" | "raw" | "hex" | "passphrase", "filesystem" | "volume", "setOnce">({
    name: "keyformat", scope: "dataset", access: "setOnce", targets: ["filesystem","volume"], codec: "enum", default: "ZFS_KEYFORMAT_NONE", values: ["none","raw","hex","passphrase"]
  }),
  encryption: defineProperty<"encryption", "on" | "off" | "aes-128-ccm" | "aes-192-ccm" | "aes-256-ccm" | "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm", "filesystem" | "volume" | "snapshot", "setOnce">({
    name: "encryption", scope: "dataset", access: "setOnce", targets: ["filesystem","volume","snapshot"], codec: "enum", default: "ZIO_CRYPT_DEFAULT", values: ["on","off","aes-128-ccm","aes-192-ccm","aes-256-ccm","aes-128-gcm","aes-192-gcm","aes-256-gcm"]
  }),
  utf8only: defineProperty<"utf8only", boolean, "filesystem" | "snapshot", "setOnce">({
    name: "utf8only", scope: "dataset", access: "setOnce", targets: ["filesystem","snapshot"], codec: "boolean", default: "0"
  }),
  origin: defineProperty<"origin", string, "filesystem" | "volume", "readonly">({
    name: "origin", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "string", default: null
  }),
  clones: defineProperty<"clones", string, "snapshot", "readonly">({
    name: "clones", scope: "dataset", access: "readonly", targets: ["snapshot"], codec: "string", default: null
  }),
  mountpoint: defineProperty<"mountpoint", string, "filesystem", "inheritable">({
    name: "mountpoint", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "string", default: "/"
  }),
  sharenfs: defineProperty<"sharenfs", string, "filesystem", "inheritable">({
    name: "sharenfs", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "string", default: "off"
  }),
  type: defineProperty<"type", string, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "type", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "string", default: null
  }),
  sharesmb: defineProperty<"sharesmb", string, "filesystem", "inheritable">({
    name: "sharesmb", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "string", default: "off"
  }),
  mlslabel: defineProperty<"mlslabel", string, "filesystem" | "volume" | "snapshot", "inheritable">({
    name: "mlslabel", scope: "dataset", access: "inheritable", targets: ["filesystem","volume","snapshot"], codec: "string", default: "ZFS_MLSLABEL_DEFAULT"
  }),
  context: defineProperty<"context", string, "filesystem" | "volume" | "snapshot", "mutable">({
    name: "context", scope: "dataset", access: "mutable", targets: ["filesystem","volume","snapshot"], codec: "string", default: "none"
  }),
  fscontext: defineProperty<"fscontext", string, "filesystem" | "volume" | "snapshot", "mutable">({
    name: "fscontext", scope: "dataset", access: "mutable", targets: ["filesystem","volume","snapshot"], codec: "string", default: "none"
  }),
  defcontext: defineProperty<"defcontext", string, "filesystem" | "volume" | "snapshot", "mutable">({
    name: "defcontext", scope: "dataset", access: "mutable", targets: ["filesystem","volume","snapshot"], codec: "string", default: "none"
  }),
  rootcontext: defineProperty<"rootcontext", string, "filesystem" | "volume" | "snapshot", "mutable">({
    name: "rootcontext", scope: "dataset", access: "mutable", targets: ["filesystem","volume","snapshot"], codec: "string", default: "none"
  }),
  receiveResumeToken: defineProperty<"receive_resume_token", string, "filesystem" | "volume", "readonly">({
    name: "receive_resume_token", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "string", default: null
  }),
  encryptionroot: defineProperty<"encryptionroot", string, "filesystem" | "volume" | "snapshot", "readonly">({
    name: "encryptionroot", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "string", default: null
  }),
  keylocation: defineProperty<"keylocation", string, "filesystem" | "volume", "mutable">({
    name: "keylocation", scope: "dataset", access: "mutable", targets: ["filesystem","volume"], codec: "string", default: "none"
  }),
  redactSnaps: defineProperty<"redact_snaps", string, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "redact_snaps", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "string", default: null
  }),
  used: defineProperty<"used", bigint, "filesystem" | "volume" | "snapshot", "readonly">({
    name: "used", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "bytes", default: "0"
  }),
  available: defineProperty<"available", bigint, "filesystem" | "volume", "readonly">({
    name: "available", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  referenced: defineProperty<"referenced", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "referenced", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bytes", default: "0"
  }),
  compressratio: defineProperty<"compressratio", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "compressratio", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bigint", default: "0"
  }),
  refcompressratio: defineProperty<"refcompressratio", bigint, "filesystem" | "volume" | "snapshot", "readonly">({
    name: "refcompressratio", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "bigint", default: "0"
  }),
  volblocksize: defineProperty<"volblocksize", bigint, "volume", "setOnce">({
    name: "volblocksize", scope: "dataset", access: "setOnce", targets: ["volume"], codec: "bigint", default: "ZVOL_DEFAULT_BLOCKSIZE"
  }),
  volthreading: defineProperty<"volthreading", boolean, "volume", "mutable">({
    name: "volthreading", scope: "dataset", access: "mutable", targets: ["volume"], codec: "boolean", default: "1"
  }),
  usedbysnapshots: defineProperty<"usedbysnapshots", bigint, "filesystem" | "volume", "readonly">({
    name: "usedbysnapshots", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  usedbydataset: defineProperty<"usedbydataset", bigint, "filesystem" | "volume", "readonly">({
    name: "usedbydataset", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  usedbychildren: defineProperty<"usedbychildren", bigint, "filesystem" | "volume", "readonly">({
    name: "usedbychildren", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  usedbyrefreservation: defineProperty<"usedbyrefreservation", bigint, "filesystem" | "volume", "readonly">({
    name: "usedbyrefreservation", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  userrefs: defineProperty<"userrefs", bigint, "snapshot", "readonly">({
    name: "userrefs", scope: "dataset", access: "readonly", targets: ["snapshot"], codec: "bigint", default: "0"
  }),
  written: defineProperty<"written", bigint, "filesystem" | "volume" | "snapshot", "readonly">({
    name: "written", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "bytes", default: "0"
  }),
  logicalused: defineProperty<"logicalused", bigint, "filesystem" | "volume", "readonly">({
    name: "logicalused", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bytes", default: "0"
  }),
  logicalreferenced: defineProperty<"logicalreferenced", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "logicalreferenced", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bytes", default: "0"
  }),
  filesystemCount: defineProperty<"filesystem_count", bigint, "filesystem", "readonly">({
    name: "filesystem_count", scope: "dataset", access: "readonly", targets: ["filesystem"], codec: "bigint", default: "UINT64_MAX"
  }),
  snapshotCount: defineProperty<"snapshot_count", bigint, "filesystem" | "volume", "readonly">({
    name: "snapshot_count", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bigint", default: "UINT64_MAX"
  }),
  guid: defineProperty<"guid", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "guid", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bigint", default: "0"
  }),
  createtxg: defineProperty<"createtxg", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "createtxg", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bigint", default: "0"
  }),
  pbkdf2iters: defineProperty<"pbkdf2iters", bigint, "filesystem" | "volume", "setOnce">({
    name: "pbkdf2iters", scope: "dataset", access: "setOnce", targets: ["filesystem","volume"], codec: "bigint", default: "0"
  }),
  objsetid: defineProperty<"objsetid", bigint, "filesystem" | "volume" | "snapshot", "readonly">({
    name: "objsetid", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot"], codec: "bigint", default: "0"
  }),
  quota: defineProperty<"quota", bigint | "none", "filesystem", "mutable">({
    name: "quota", scope: "dataset", access: "mutable", targets: ["filesystem"], codec: "bytesOrNone", default: "0"
  }),
  reservation: defineProperty<"reservation", bigint | "none", "filesystem" | "volume", "mutable">({
    name: "reservation", scope: "dataset", access: "mutable", targets: ["filesystem","volume"], codec: "bytesOrNone", default: "0"
  }),
  volsize: defineProperty<"volsize", bigint, "volume" | "snapshot", "mutable">({
    name: "volsize", scope: "dataset", access: "mutable", targets: ["volume","snapshot"], codec: "bytes", default: "0"
  }),
  refquota: defineProperty<"refquota", bigint | "none", "filesystem", "mutable">({
    name: "refquota", scope: "dataset", access: "mutable", targets: ["filesystem"], codec: "bytesOrNone", default: "0"
  }),
  refreservation: defineProperty<"refreservation", bigint | "none", "filesystem" | "volume", "mutable">({
    name: "refreservation", scope: "dataset", access: "mutable", targets: ["filesystem","volume"], codec: "bytesOrNone", default: "0"
  }),
  filesystemLimit: defineProperty<"filesystem_limit", bigint, "filesystem", "mutable">({
    name: "filesystem_limit", scope: "dataset", access: "mutable", targets: ["filesystem"], codec: "bigint", default: "UINT64_MAX"
  }),
  snapshotLimit: defineProperty<"snapshot_limit", bigint, "filesystem" | "volume", "mutable">({
    name: "snapshot_limit", scope: "dataset", access: "mutable", targets: ["filesystem","volume"], codec: "bigint", default: "UINT64_MAX"
  }),
  defaultuserquota: defineProperty<"defaultuserquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultuserquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  defaultgroupquota: defineProperty<"defaultgroupquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultgroupquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  defaultprojectquota: defineProperty<"defaultprojectquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultprojectquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  defaultuserobjquota: defineProperty<"defaultuserobjquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultuserobjquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  defaultgroupobjquota: defineProperty<"defaultgroupobjquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultgroupobjquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  defaultprojectobjquota: defineProperty<"defaultprojectobjquota", bigint | "none", "filesystem" | "snapshot", "mutable">({
    name: "defaultprojectobjquota", scope: "dataset", access: "mutable", targets: ["filesystem","snapshot"], codec: "bytesOrNone", default: "0"
  }),
  recordsize: defineProperty<"recordsize", bigint, "filesystem", "inheritable">({
    name: "recordsize", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "bytes", default: "SPA_OLD_MAXBLOCKSIZE"
  }),
  specialSmallBlocks: defineProperty<"special_small_blocks", bigint, "filesystem" | "volume", "inheritable">({
    name: "special_small_blocks", scope: "dataset", access: "inheritable", targets: ["filesystem","volume"], codec: "bigint", default: "0"
  }),
  creation: defineProperty<"creation", bigint, "filesystem" | "volume" | "snapshot" | "bookmark", "readonly">({
    name: "creation", scope: "dataset", access: "readonly", targets: ["filesystem","volume","snapshot","bookmark"], codec: "bigint", default: "0"
  }),
  snapshotsChanged: defineProperty<"snapshots_changed", bigint, "filesystem" | "volume", "readonly">({
    name: "snapshots_changed", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bigint", default: "0"
  }),
  snapshotsChangedNsecs: defineProperty<"snapshots_changed_nsecs", bigint, "filesystem" | "volume", "readonly">({
    name: "snapshots_changed_nsecs", scope: "dataset", access: "readonly", targets: ["filesystem","volume"], codec: "bigint", default: "0"
  }),
  longname: defineProperty<"longname", boolean, "filesystem", "inheritable">({
    name: "longname", scope: "dataset", access: "inheritable", targets: ["filesystem"], codec: "boolean", default: "0"
  }),
} as const

export const PoolProperty = {
  altroot: defineProperty<"altroot", string, "pool", "mutable">({
    name: "altroot", scope: "pool", access: "mutable", targets: ["pool"], codec: "string", default: null
  }),
  bootfs: defineProperty<"bootfs", string, "pool", "mutable">({
    name: "bootfs", scope: "pool", access: "mutable", targets: ["pool"], codec: "string", default: null
  }),
  cachefile: defineProperty<"cachefile", string, "pool", "mutable">({
    name: "cachefile", scope: "pool", access: "mutable", targets: ["pool"], codec: "string", default: null
  }),
  comment: defineProperty<"comment", string, "pool", "mutable">({
    name: "comment", scope: "pool", access: "mutable", targets: ["pool"], codec: "string", default: null
  }),
  compatibility: defineProperty<"compatibility", string, "pool", "mutable">({
    name: "compatibility", scope: "pool", access: "mutable", targets: ["pool"], codec: "string", default: "off"
  }),
  size: defineProperty<"size", bigint, "pool", "readonly">({
    name: "size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  free: defineProperty<"free", bigint, "pool", "readonly">({
    name: "free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  freeing: defineProperty<"freeing", bigint, "pool", "readonly">({
    name: "freeing", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  checkpoint: defineProperty<"checkpoint", bigint, "pool", "readonly">({
    name: "checkpoint", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  leaked: defineProperty<"leaked", bigint, "pool", "readonly">({
    name: "leaked", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  allocated: defineProperty<"allocated", bigint, "pool", "readonly">({
    name: "allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  expandsize: defineProperty<"expandsize", bigint, "pool", "readonly">({
    name: "expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  fragmentation: defineProperty<"fragmentation", number, "pool", "readonly">({
    name: "fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  capacity: defineProperty<"capacity", number, "pool", "readonly">({
    name: "capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  guid: defineProperty<"guid", bigint, "pool", "readonly">({
    name: "guid", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  loadGuid: defineProperty<"load_guid", bigint, "pool", "readonly">({
    name: "load_guid", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  health: defineProperty<"health", bigint, "pool", "readonly">({
    name: "health", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  dedupratio: defineProperty<"dedupratio", bigint, "pool", "readonly">({
    name: "dedupratio", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  dedupused: defineProperty<"dedupused", bigint, "pool", "readonly">({
    name: "dedupused", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  dedupsaved: defineProperty<"dedupsaved", bigint, "pool", "readonly">({
    name: "dedupsaved", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  bcloneused: defineProperty<"bcloneused", bigint, "pool", "readonly">({
    name: "bcloneused", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  bclonesaved: defineProperty<"bclonesaved", bigint, "pool", "readonly">({
    name: "bclonesaved", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  bcloneratio: defineProperty<"bcloneratio", bigint, "pool", "readonly">({
    name: "bcloneratio", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  dedupTableSize: defineProperty<"dedup_table_size", bigint, "pool", "readonly">({
    name: "dedup_table_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  lastScrubbedTxg: defineProperty<"last_scrubbed_txg", bigint, "pool", "readonly">({
    name: "last_scrubbed_txg", scope: "pool", access: "readonly", targets: ["pool"], codec: "bigint", default: "0"
  }),
  available: defineProperty<"available", bigint, "pool", "readonly">({
    name: "available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  usable: defineProperty<"usable", bigint, "pool", "readonly">({
    name: "usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  used: defineProperty<"used", bigint, "pool", "readonly">({
    name: "used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalSize: defineProperty<"class_normal_size", bigint, "pool", "readonly">({
    name: "class_normal_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalCapacity: defineProperty<"class_normal_capacity", number, "pool", "readonly">({
    name: "class_normal_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classNormalFree: defineProperty<"class_normal_free", bigint, "pool", "readonly">({
    name: "class_normal_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalAllocated: defineProperty<"class_normal_allocated", bigint, "pool", "readonly">({
    name: "class_normal_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalAvailable: defineProperty<"class_normal_available", bigint, "pool", "readonly">({
    name: "class_normal_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalUsable: defineProperty<"class_normal_usable", bigint, "pool", "readonly">({
    name: "class_normal_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalUsed: defineProperty<"class_normal_used", bigint, "pool", "readonly">({
    name: "class_normal_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalExpandsize: defineProperty<"class_normal_expandsize", bigint, "pool", "readonly">({
    name: "class_normal_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classNormalFragmentation: defineProperty<"class_normal_fragmentation", number, "pool", "readonly">({
    name: "class_normal_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classSpecialSize: defineProperty<"class_special_size", bigint, "pool", "readonly">({
    name: "class_special_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialCapacity: defineProperty<"class_special_capacity", number, "pool", "readonly">({
    name: "class_special_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classSpecialFree: defineProperty<"class_special_free", bigint, "pool", "readonly">({
    name: "class_special_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialAllocated: defineProperty<"class_special_allocated", bigint, "pool", "readonly">({
    name: "class_special_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialAvailable: defineProperty<"class_special_available", bigint, "pool", "readonly">({
    name: "class_special_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialUsable: defineProperty<"class_special_usable", bigint, "pool", "readonly">({
    name: "class_special_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialUsed: defineProperty<"class_special_used", bigint, "pool", "readonly">({
    name: "class_special_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialExpandsize: defineProperty<"class_special_expandsize", bigint, "pool", "readonly">({
    name: "class_special_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialFragmentation: defineProperty<"class_special_fragmentation", number, "pool", "readonly">({
    name: "class_special_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classDedupSize: defineProperty<"class_dedup_size", bigint, "pool", "readonly">({
    name: "class_dedup_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupCapacity: defineProperty<"class_dedup_capacity", number, "pool", "readonly">({
    name: "class_dedup_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classDedupFree: defineProperty<"class_dedup_free", bigint, "pool", "readonly">({
    name: "class_dedup_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupAllocated: defineProperty<"class_dedup_allocated", bigint, "pool", "readonly">({
    name: "class_dedup_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupAvailable: defineProperty<"class_dedup_available", bigint, "pool", "readonly">({
    name: "class_dedup_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupUsable: defineProperty<"class_dedup_usable", bigint, "pool", "readonly">({
    name: "class_dedup_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupUsed: defineProperty<"class_dedup_used", bigint, "pool", "readonly">({
    name: "class_dedup_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupExpandsize: defineProperty<"class_dedup_expandsize", bigint, "pool", "readonly">({
    name: "class_dedup_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classDedupFragmentation: defineProperty<"class_dedup_fragmentation", number, "pool", "readonly">({
    name: "class_dedup_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classLogSize: defineProperty<"class_log_size", bigint, "pool", "readonly">({
    name: "class_log_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogCapacity: defineProperty<"class_log_capacity", number, "pool", "readonly">({
    name: "class_log_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classLogFree: defineProperty<"class_log_free", bigint, "pool", "readonly">({
    name: "class_log_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogAllocated: defineProperty<"class_log_allocated", bigint, "pool", "readonly">({
    name: "class_log_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogAvailable: defineProperty<"class_log_available", bigint, "pool", "readonly">({
    name: "class_log_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogUsable: defineProperty<"class_log_usable", bigint, "pool", "readonly">({
    name: "class_log_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogUsed: defineProperty<"class_log_used", bigint, "pool", "readonly">({
    name: "class_log_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogExpandsize: defineProperty<"class_log_expandsize", bigint, "pool", "readonly">({
    name: "class_log_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classLogFragmentation: defineProperty<"class_log_fragmentation", number, "pool", "readonly">({
    name: "class_log_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classElogSize: defineProperty<"class_elog_size", bigint, "pool", "readonly">({
    name: "class_elog_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogCapacity: defineProperty<"class_elog_capacity", number, "pool", "readonly">({
    name: "class_elog_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classElogFree: defineProperty<"class_elog_free", bigint, "pool", "readonly">({
    name: "class_elog_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogAllocated: defineProperty<"class_elog_allocated", bigint, "pool", "readonly">({
    name: "class_elog_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogAvailable: defineProperty<"class_elog_available", bigint, "pool", "readonly">({
    name: "class_elog_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogUsable: defineProperty<"class_elog_usable", bigint, "pool", "readonly">({
    name: "class_elog_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogUsed: defineProperty<"class_elog_used", bigint, "pool", "readonly">({
    name: "class_elog_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogExpandsize: defineProperty<"class_elog_expandsize", bigint, "pool", "readonly">({
    name: "class_elog_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classElogFragmentation: defineProperty<"class_elog_fragmentation", number, "pool", "readonly">({
    name: "class_elog_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classSpecialElogSize: defineProperty<"class_special_elog_size", bigint, "pool", "readonly">({
    name: "class_special_elog_size", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogCapacity: defineProperty<"class_special_elog_capacity", number, "pool", "readonly">({
    name: "class_special_elog_capacity", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  classSpecialElogFree: defineProperty<"class_special_elog_free", bigint, "pool", "readonly">({
    name: "class_special_elog_free", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogAllocated: defineProperty<"class_special_elog_allocated", bigint, "pool", "readonly">({
    name: "class_special_elog_allocated", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogAvailable: defineProperty<"class_special_elog_available", bigint, "pool", "readonly">({
    name: "class_special_elog_available", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogUsable: defineProperty<"class_special_elog_usable", bigint, "pool", "readonly">({
    name: "class_special_elog_usable", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogUsed: defineProperty<"class_special_elog_used", bigint, "pool", "readonly">({
    name: "class_special_elog_used", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogExpandsize: defineProperty<"class_special_elog_expandsize", bigint, "pool", "readonly">({
    name: "class_special_elog_expandsize", scope: "pool", access: "readonly", targets: ["pool"], codec: "bytes", default: "0"
  }),
  classSpecialElogFragmentation: defineProperty<"class_special_elog_fragmentation", number, "pool", "readonly">({
    name: "class_special_elog_fragmentation", scope: "pool", access: "readonly", targets: ["pool"], codec: "integer", default: "0"
  }),
  version: defineProperty<"version", bigint, "pool", "mutable">({
    name: "version", scope: "pool", access: "mutable", targets: ["pool"], codec: "bigint", default: "SPA_VERSION"
  }),
  ashift: defineProperty<"ashift", number, "pool", "mutable">({
    name: "ashift", scope: "pool", access: "mutable", targets: ["pool"], codec: "integer", default: "0"
  }),
  dedupTableQuota: defineProperty<"dedup_table_quota", bigint, "pool", "mutable">({
    name: "dedup_table_quota", scope: "pool", access: "mutable", targets: ["pool"], codec: "bytes", default: "UINT64_MAX"
  }),
  delegation: defineProperty<"delegation", boolean, "pool", "mutable">({
    name: "delegation", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "1"
  }),
  autoreplace: defineProperty<"autoreplace", boolean, "pool", "mutable">({
    name: "autoreplace", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "0"
  }),
  listsnapshots: defineProperty<"listsnapshots", boolean, "pool", "mutable">({
    name: "listsnapshots", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "0"
  }),
  autoexpand: defineProperty<"autoexpand", boolean, "pool", "mutable">({
    name: "autoexpand", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "0"
  }),
  readonly: defineProperty<"readonly", boolean, "pool", "mutable">({
    name: "readonly", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "0"
  }),
  multihost: defineProperty<"multihost", boolean, "pool", "mutable">({
    name: "multihost", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "0"
  }),
  failmode: defineProperty<"failmode", "wait" | "continue" | "panic", "pool", "mutable">({
    name: "failmode", scope: "pool", access: "mutable", targets: ["pool"], codec: "enum", default: "ZIO_FAILURE_MODE_WAIT", values: ["wait","continue","panic"]
  }),
  autotrim: defineProperty<"autotrim", boolean, "pool", "mutable">({
    name: "autotrim", scope: "pool", access: "mutable", targets: ["pool"], codec: "boolean", default: "SPA_AUTOTRIM_OFF"
  }),
} as const

export const VdevProperty = {
  comment: defineProperty<"comment", string, "vdev", "mutable">({
    name: "comment", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "string", default: null
  }),
  path: defineProperty<"path", string, "vdev", "mutable">({
    name: "path", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "string", default: null
  }),
  devid: defineProperty<"devid", string, "vdev", "readonly">({
    name: "devid", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  physpath: defineProperty<"physpath", string, "vdev", "readonly">({
    name: "physpath", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  encpath: defineProperty<"encpath", string, "vdev", "readonly">({
    name: "encpath", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  fru: defineProperty<"fru", string, "vdev", "readonly">({
    name: "fru", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  parent: defineProperty<"parent", string, "vdev", "readonly">({
    name: "parent", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  children: defineProperty<"children", string, "vdev", "readonly">({
    name: "children", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "string", default: null
  }),
  size: defineProperty<"size", bigint, "vdev", "readonly">({
    name: "size", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bytes", default: "0"
  }),
  free: defineProperty<"free", bigint, "vdev", "readonly">({
    name: "free", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bytes", default: "0"
  }),
  allocated: defineProperty<"allocated", bigint, "vdev", "readonly">({
    name: "allocated", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bytes", default: "0"
  }),
  expandsize: defineProperty<"expandsize", bigint, "vdev", "readonly">({
    name: "expandsize", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bytes", default: "0"
  }),
  fragmentation: defineProperty<"fragmentation", number, "vdev", "readonly">({
    name: "fragmentation", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "integer", default: "0"
  }),
  capacity: defineProperty<"capacity", number, "vdev", "readonly">({
    name: "capacity", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "integer", default: "0"
  }),
  guid: defineProperty<"guid", bigint, "vdev", "readonly">({
    name: "guid", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  state: defineProperty<"state", bigint, "vdev", "readonly">({
    name: "state", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  bootsize: defineProperty<"bootsize", bigint, "vdev", "readonly">({
    name: "bootsize", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bytes", default: "0"
  }),
  asize: defineProperty<"asize", bigint, "vdev", "readonly">({
    name: "asize", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  psize: defineProperty<"psize", bigint, "vdev", "readonly">({
    name: "psize", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  ashift: defineProperty<"ashift", bigint, "vdev", "readonly">({
    name: "ashift", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  parity: defineProperty<"parity", bigint, "vdev", "readonly">({
    name: "parity", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  failureDomain: defineProperty<"failure_domain", bigint, "vdev", "readonly">({
    name: "failure_domain", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  failureGroup: defineProperty<"failure_group", bigint, "vdev", "readonly">({
    name: "failure_group", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  numchildren: defineProperty<"numchildren", bigint, "vdev", "readonly">({
    name: "numchildren", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  readErrors: defineProperty<"read_errors", bigint, "vdev", "readonly">({
    name: "read_errors", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  writeErrors: defineProperty<"write_errors", bigint, "vdev", "readonly">({
    name: "write_errors", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  checksumErrors: defineProperty<"checksum_errors", bigint, "vdev", "readonly">({
    name: "checksum_errors", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  initializeErrors: defineProperty<"initialize_errors", bigint, "vdev", "readonly">({
    name: "initialize_errors", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  trimErrors: defineProperty<"trim_errors", bigint, "vdev", "readonly">({
    name: "trim_errors", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  slowIos: defineProperty<"slow_ios", bigint, "vdev", "readonly">({
    name: "slow_ios", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  nullOps: defineProperty<"null_ops", bigint, "vdev", "readonly">({
    name: "null_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  readOps: defineProperty<"read_ops", bigint, "vdev", "readonly">({
    name: "read_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  writeOps: defineProperty<"write_ops", bigint, "vdev", "readonly">({
    name: "write_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  freeOps: defineProperty<"free_ops", bigint, "vdev", "readonly">({
    name: "free_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  claimOps: defineProperty<"claim_ops", bigint, "vdev", "readonly">({
    name: "claim_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  trimOps: defineProperty<"trim_ops", bigint, "vdev", "readonly">({
    name: "trim_ops", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  nullBytes: defineProperty<"null_bytes", bigint, "vdev", "readonly">({
    name: "null_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  readBytes: defineProperty<"read_bytes", bigint, "vdev", "readonly">({
    name: "read_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  writeBytes: defineProperty<"write_bytes", bigint, "vdev", "readonly">({
    name: "write_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  freeBytes: defineProperty<"free_bytes", bigint, "vdev", "readonly">({
    name: "free_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  claimBytes: defineProperty<"claim_bytes", bigint, "vdev", "readonly">({
    name: "claim_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  trimBytes: defineProperty<"trim_bytes", bigint, "vdev", "readonly">({
    name: "trim_bytes", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "bigint", default: "0"
  }),
  checksumN: defineProperty<"checksum_n", bigint, "vdev", "mutable">({
    name: "checksum_n", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  checksumT: defineProperty<"checksum_t", bigint, "vdev", "mutable">({
    name: "checksum_t", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  ioN: defineProperty<"io_n", bigint, "vdev", "mutable">({
    name: "io_n", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  ioT: defineProperty<"io_t", bigint, "vdev", "mutable">({
    name: "io_t", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  slowIoN: defineProperty<"slow_io_n", bigint, "vdev", "mutable">({
    name: "slow_io_n", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  slowIoT: defineProperty<"slow_io_t", bigint, "vdev", "mutable">({
    name: "slow_io_t", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "bigint", default: "UINT64_MAX"
  }),
  removing: defineProperty<"removing", boolean, "vdev", "readonly">({
    name: "removing", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "boolean", default: "0"
  }),
  allocating: defineProperty<"allocating", "off" | "on" | "-", "vdev", "mutable">({
    name: "allocating", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "enum", default: "1", values: ["off","on","-"]
  }),
  raidzExpanding: defineProperty<"raidz_expanding", boolean, "vdev", "readonly">({
    name: "raidz_expanding", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "boolean", default: "0"
  }),
  sitOut: defineProperty<"sit_out", boolean, "vdev", "mutable">({
    name: "sit_out", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "boolean", default: "0"
  }),
  trimSupport: defineProperty<"trim_support", boolean, "vdev", "readonly">({
    name: "trim_support", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "boolean", default: "0"
  }),
  autosit: defineProperty<"autosit", boolean, "vdev", "mutable">({
    name: "autosit", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "boolean", default: "0"
  }),
  failfast: defineProperty<"failfast", "off" | "on" | "inherit", "vdev", "mutable">({
    name: "failfast", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "enum", default: "B_TRUE", values: ["off","on","inherit"]
  }),
  slowIoEvents: defineProperty<"slow_io_events", boolean, "vdev", "mutable">({
    name: "slow_io_events", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "boolean", default: "B_TRUE"
  }),
  scheduler: defineProperty<"scheduler", "auto" | "on" | "off", "vdev", "mutable">({
    name: "scheduler", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "enum", default: "VDEV_SCHEDULER_AUTO", values: ["auto","on","off"]
  }),
  allocBias: defineProperty<"alloc_bias", "none" | "log" | "special" | "dedup", "vdev", "mutable">({
    name: "alloc_bias", scope: "vdev", access: "mutable", targets: ["vdev"], codec: "enum", default: "VDEV_BIAS_NONE", values: ["none","log","special","dedup"]
  }),
  rotational: defineProperty<"rotational", boolean, "vdev", "readonly">({
    name: "rotational", scope: "vdev", access: "readonly", targets: ["vdev"], codec: "boolean", default: "0"
  }),
} as const

export const datasetPropertyNames = ["redundant_metadata", "sync", "checksum", "dedup", "compression", "snapdir", "snapdev", "aclmode", "aclinherit", "copies", "primarycache", "secondarycache", "prefetch", "logbias", "xattr", "dnodesize", "volmode", "direct", "atime", "devices", "exec", "setuid", "readonly", "jailed", "zoned", "zoned_uid", "vscan", "nbmand", "overlay", "version", "canmount", "mounted", "defer_destroy", "keystatus", "normalization", "casesensitivity", "keyformat", "encryption", "utf8only", "origin", "clones", "mountpoint", "sharenfs", "type", "sharesmb", "mlslabel", "context", "fscontext", "defcontext", "rootcontext", "receive_resume_token", "encryptionroot", "keylocation", "redact_snaps", "used", "available", "referenced", "compressratio", "refcompressratio", "volblocksize", "volthreading", "usedbysnapshots", "usedbydataset", "usedbychildren", "usedbyrefreservation", "userrefs", "written", "logicalused", "logicalreferenced", "filesystem_count", "snapshot_count", "guid", "createtxg", "pbkdf2iters", "objsetid", "quota", "reservation", "volsize", "refquota", "refreservation", "filesystem_limit", "snapshot_limit", "defaultuserquota", "defaultgroupquota", "defaultprojectquota", "defaultuserobjquota", "defaultgroupobjquota", "defaultprojectobjquota", "recordsize", "special_small_blocks", "creation", "snapshots_changed", "snapshots_changed_nsecs", "longname"] as const

export const poolPropertyNames = ["altroot", "bootfs", "cachefile", "comment", "compatibility", "size", "free", "freeing", "checkpoint", "leaked", "allocated", "expandsize", "fragmentation", "capacity", "guid", "load_guid", "health", "dedupratio", "dedupused", "dedupsaved", "bcloneused", "bclonesaved", "bcloneratio", "dedup_table_size", "last_scrubbed_txg", "available", "usable", "used", "class_normal_size", "class_normal_capacity", "class_normal_free", "class_normal_allocated", "class_normal_available", "class_normal_usable", "class_normal_used", "class_normal_expandsize", "class_normal_fragmentation", "class_special_size", "class_special_capacity", "class_special_free", "class_special_allocated", "class_special_available", "class_special_usable", "class_special_used", "class_special_expandsize", "class_special_fragmentation", "class_dedup_size", "class_dedup_capacity", "class_dedup_free", "class_dedup_allocated", "class_dedup_available", "class_dedup_usable", "class_dedup_used", "class_dedup_expandsize", "class_dedup_fragmentation", "class_log_size", "class_log_capacity", "class_log_free", "class_log_allocated", "class_log_available", "class_log_usable", "class_log_used", "class_log_expandsize", "class_log_fragmentation", "class_elog_size", "class_elog_capacity", "class_elog_free", "class_elog_allocated", "class_elog_available", "class_elog_usable", "class_elog_used", "class_elog_expandsize", "class_elog_fragmentation", "class_special_elog_size", "class_special_elog_capacity", "class_special_elog_free", "class_special_elog_allocated", "class_special_elog_available", "class_special_elog_usable", "class_special_elog_used", "class_special_elog_expandsize", "class_special_elog_fragmentation", "version", "ashift", "dedup_table_quota", "delegation", "autoreplace", "listsnapshots", "autoexpand", "readonly", "multihost", "failmode", "autotrim"] as const

export const vdevPropertyNames = ["comment", "path", "devid", "physpath", "encpath", "fru", "parent", "children", "size", "free", "allocated", "expandsize", "fragmentation", "capacity", "guid", "state", "bootsize", "asize", "psize", "ashift", "parity", "failure_domain", "failure_group", "numchildren", "read_errors", "write_errors", "checksum_errors", "initialize_errors", "trim_errors", "slow_ios", "null_ops", "read_ops", "write_ops", "free_ops", "claim_ops", "trim_ops", "null_bytes", "read_bytes", "write_bytes", "free_bytes", "claim_bytes", "trim_bytes", "checksum_n", "checksum_t", "io_n", "io_t", "slow_io_n", "slow_io_t", "removing", "allocating", "raidz_expanding", "sit_out", "trim_support", "autosit", "failfast", "slow_io_events", "scheduler", "alloc_bias", "rotational"] as const
