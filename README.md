# JCake-Utils

As I write more stuff, I accumulate different utilities that I use in my projects.
Instead of copy-pasting them into each project I intend to use them in, I'll just make a repo containing each of them. 
The idea is that if you need to use one, you just add the repo as a dependency to your `package.json`, and call import
like this:

```typescript
import DB from 'jcake-utils/db';
import args from 'jcake-utils/args';
import buffer from 'jcake-utils/buffer';
...
```

## Utils

    - [DB](#db)
    - [Arg Parser](#args)
    - [Iter/AsyncIter](#iters)
    - [Buffer](#buffer)
    - [String Utilities](#strings)

### db

JCake Database Objects are database files with a specialised binary format, analogous to a filesystem - containing data in tree-like structures. This allows a user to query the database and access a customised set of data.
As of the present, the database cannot manipulate the result of a query, but can only access the data. To do this, the user is expected to be able to perform data processing after the query has completed. 

The database interface works as follows:

1. Open a file with Read/Write permissions (Write is optional, but recommended) through the NodeJS `fs.promises` interface. 
   1. For read-only access to the database, the `readonly` parameter should be passed to the constructor for clarity.
2. The database constructor accepts an `fs.promises.FileHandle` object as its first argument.
3. For TypeScript users, it's a very good idea to define the type of data contained in teh database, by passing an interface as its first and only generic argument. 
4. Database queries are an array of type `keyof any`. The query system is fully typed and will only accept a list of keys that are defined in the provided interface. To disable this behaviour, pass `any` as the first generic argument.
5. For a command-line interface, the database can be queried through the `jcake-utils/dbrepl` module.
   
### args

Parsing CLI arguments is a pain, especially without a framework. However, most provide amazing functionality, making them very bloated. 
`JCake-utils` provides a very basic and fully typed CLI argument parser. 

To use it, simply import it and call the `parse` function with the arguments you want to parse.

It accepts two arguments, the first is a map of options, while the second is the _default_ argument, which in most CLI applications is the first argument without an accompanying argument name, such as a double-dash argument.

An example:

```typescript
import parse, * as Format from 'jcake-utils/args';

export const config = parse({
    port: {
        long: 'port',
        short: 'p',
        format: Format.Int,
        default: 8080
    },
    database: {
        long: 'database',
        short: 'd',
        format: Format.Path(true),
    },
    silent: {
        long: 'silent',
        short: 's',
    }
}, Format.Path(true))(process.argv.slice(2));
```

If the above program is called through `node program.js --port=8080 --database=./db.bin --silent`, the output will be:

```typescript
{
    port: 8080, 
    database: './db.bin', 
    silent: true
}
```
Notice how omitting the `format` property will force the parser to treat the argument as a boolean switch. 
It is worth emphasising that the parser is fully typed. So `typeof config` will be `{port: number, database: string, silent: boolean, default: string}`.
It is also possible to define custom formatters. A custom formatter is any function which accepts a token of type `string` and returns `any`. By specifying types, the parser will correctly return the return type in the result. 

An example would be of date formatting.

 ```typescript
import parse, * as Format from 'jcake-utils/args';

export const config = parse({
    date: {
        long: 'date',
        short: 'd',
        format: tok => new Date(tok),
    }
})(process.argv.slice(2));

typeof config = {
    date: Date,
    default: undefined
}
```

Omitting the `default` property will cause the parser to throw an error if the argument is not provided. 

### iters

Iterators are a very useful tool for handling potentially large sets of data with a small memory footprint. However, unline languages like Rust, there is no standard interface around them. Of course you can use `for` loops, but the functionality of general manipulation is lacking. Hence the `Iter`/`IterSync` functions act like constructors which provide chainable functions for manipulating the data.

They provide functionality to `map`, `filter`, `filtermap`, `reduce`, `concat` and `collect`, and can be passed to a `for` at each point, without needing to be `collect`ed.

### buffer

NodeJS Buffers provide windows into a region of contiguous memory. They are useful for manipulating raw bytes directly. However lack functionality for prepopulating them with data. The `buffer` module provides a number of functions for instantiating buffers. 

The `buffer` module is presently optimised for use in previous projects, so only includes unsigned integer in Little Endian format, but proves useful regardless.

Each method is chainable, until the `done` function is called, at which point a completed `Buffer` object is returned containing the sequence of bytes inserted previously. 

### strings

These are general-purpose string utilities - things I tend to find myself repeating. 
* Bracket counting
* Friendly file sizes
* Custom whitespace trimmers
* Prefixing lines

etc.