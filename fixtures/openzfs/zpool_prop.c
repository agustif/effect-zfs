static const zprop_index_t boolean_table[] = {
  { "off", 0 }, { "on", 1 }, { NULL }
};
static const zprop_index_t failuremode_table[] = {
  { "wait", 0 }, { "continue", 1 }, { "panic", 2 }, { NULL }
};
void zpool_prop_init(void) {
  zprop_register_number(ZPOOL_PROP_SIZE, "size", 0, PROP_READONLY, ZFS_TYPE_POOL, "<size>", "SIZE", 0, NULL);
  zprop_register_number(ZPOOL_PROP_FREE, "free", 0, PROP_READONLY, ZFS_TYPE_POOL, "<size>", "FREE", 0, NULL);
  zprop_register_number(ZPOOL_PROP_ASHIFT, "ashift", 0, PROP_DEFAULT, ZFS_TYPE_POOL, "<ashift, 9-16, or 0=default>", "ASHIFT", 0, NULL);
  zprop_register_index(ZPOOL_PROP_AUTOTRIM, "autotrim", 0, PROP_DEFAULT, ZFS_TYPE_POOL, "on | off", "AUTOTRIM", boolean_table, NULL);
  zprop_register_index(ZPOOL_PROP_READONLY, "readonly", 0, PROP_DEFAULT, ZFS_TYPE_POOL, "on | off", "RDONLY", boolean_table, NULL);
  zprop_register_index(ZPOOL_PROP_FAILUREMODE, "failmode", 0, PROP_DEFAULT, ZFS_TYPE_POOL, "wait | continue | panic", "FAILMODE", failuremode_table, NULL);
}
