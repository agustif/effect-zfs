# effect-zfs

Effect v4 library for Linux OpenZFS 2.2.2–2.4.4.

See the [repository README](https://github.com/agustif/effect-zfs) for usage,
native vs CLI, live tests, and remaining ioctl-only ops.

```ts
import { Datasets, Name, layer } from "effect-zfs"
import * as Native from "effect-zfs/native"
```

On Linux, provide `Native.linuxLayer()`. Peer: `effect@>=4.0.0-rc.111 <5`.
