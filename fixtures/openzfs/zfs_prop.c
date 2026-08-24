static const zprop_index_t boolean_table[] = {
  { "off", 0 }, { "on", 1 }, { NULL }
};
static const zprop_index_t compress_table[] = {
  { "on", 1 }, { "off", 0 }, { "lz4", 15 }, { "zstd", 16 }, { "zstd-1", 17 }, { "zstd-3", 19 }, { "zstd-19", 35 }, { NULL }
};
static const zprop_index_t crypto_table[] = {
  { "on", 1 }, { "off", 0 }, { "aes-128-ccm", 3 }, { "aes-256-gcm", 8 }, { NULL }
};
static const zprop_index_t keyformat_table[] = {
  { "none", 0 }, { "raw", 1 }, { "hex", 2 }, { "passphrase", 3 }, { NULL }
};
void zfs_prop_init(void) {
  zprop_register_index(ZFS_PROP_COMPRESSION, "compression", 1, PROP_INHERIT, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "on | off | lz4 | zstd", "COMPRESS", compress_table, NULL);
  zprop_register_index(ZFS_PROP_ATIME, "atime", 1, PROP_INHERIT, ZFS_TYPE_FILESYSTEM, "on | off", "ATIME", boolean_table, NULL);
  zprop_register_number(ZFS_PROP_RECORDSIZE, "recordsize", 131072, PROP_INHERIT, ZFS_TYPE_FILESYSTEM, "<size>", "RECSIZE", 0, NULL);
  zprop_register_number(ZFS_PROP_QUOTA, "quota", 0, PROP_INHERIT, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "<size> | none", "QUOTA", 0, NULL);
  zprop_register_number(ZFS_PROP_USED, "used", 0, PROP_READONLY, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME | ZFS_TYPE_SNAPSHOT, "<size>", "USED", 0, NULL);
  zprop_register_number(ZFS_PROP_AVAILABLE, "available", 0, PROP_READONLY, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "<size>", "AVAIL", 0, NULL);
  zprop_register_string(ZFS_PROP_MOUNTPOINT, "mountpoint", "/", PROP_INHERIT, ZFS_TYPE_FILESYSTEM, "<path> | legacy | none", "MOUNTPOINT", NULL);
  zprop_register_index(ZFS_PROP_ENCRYPTION, "encryption", 0, PROP_ONETIME, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "on | off | aes-*", "ENCRYPTION", crypto_table, NULL);
  zprop_register_index(ZFS_PROP_KEYFORMAT, "keyformat", 0, PROP_ONETIME, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "none | raw | hex | passphrase", "KEYFORMAT", keyformat_table, NULL);
}
