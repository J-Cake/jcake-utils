# JCake-Utils

As I write more stuff, I accumulate different utilities that I use in my projects.
Instead of copy-pasting them into each project I intend to use them in, I'll just make a repo containing each of them. 
The idea is that if you need to use one, you just add the repo as a dependency to your `package.json`, and call import
like this:

```typescript
import DB from 'jcake-utils/db';
import args from 'jcake-utils/args';
import buffer from 'jcake-utils/buffer';
// ...
```

# Contributing

See (Contributing)[./Contributing.md]