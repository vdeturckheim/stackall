'use strict';
const Fs = require('fs');
const Hook = require('compile-hook');
const Acorn = require('acorn-jsx');
const Falafel = require('falafel');
const StackTraceParser = require('stacktrace-parser');

let fileName = 'stackAll';

const getKey = function (line) {

    return line.file + ':' + line.methodName;
};

const total = {};

const preExitHandler = function () {

    Fs.writeFileSync(`./${fileName}.json`, JSON.stringify(total));
    process.exit();
};
// https://nodejs.org/api/process.html#process_event_beforeexit
// be fore exit, we logout sqreen
process.on('beforeExit', preExitHandler);
process.on('SIGINT', preExitHandler);

const record = function (key, stack, noLine) {

    total[key] = total[key] || {};
    total[key].call = total[key].call + 1 || 1;

    if (stack.length > 0) {
        const caller = getKey(stack.shift(), noLine);
        total[key][caller] = total[key][caller] + 1 || 1;

        record(caller, stack, true);
    }
};

process.__traceur = function (stack) {

    const lines = StackTraceParser.parse(stack);
    const key = getKey(lines.shift());
    record(key, lines);

};

const hijack = function (script) {

    return Falafel(script, { parser: Acorn }, (node) => {

        if ( node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
            const src = node.body.source().trim().slice(0, -1).slice(1);

            node.body.update(`{ process.__traceur((new Error()).stack)\n ${src} }`);
        }
    });
};

Hook.placeHook((content, filename, done) => {

    done(hijack(content));
});

module.exports = function (x) {

    fileName = x || fileName;
};

