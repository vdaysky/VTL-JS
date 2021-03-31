
function getScope(scope, init_with)
{
    let obj = window;
    let parts = scope.split(".");
    for (let [i, path] of parts.entries())
    {
        let child = obj[path];
        if (!child)
        {
            if (init_with)
            {
                if (i == parts.length - 1) {
                    obj[path] = init_with
                }
                else {
                    obj[path] = {}
                }
                child = obj[path]
            }
            else
            {
                return;
            }
        }
        obj = child;
    }
    return obj;
}

function getValue(name, context)
{
    // serch for var everywhere
    let global_var = window[name];
    let context_var = context[name];
    let stack_var = findInStack(name);
    let chain_var = context.__chain_parent ? context.__chain_parent[name] : undefined;

    if (context_var != undefined)
        return context_var
    if (stack_var != undefined)
        return stack_var
    if (global_var != undefined)
        return global_var
    if (chain_var != undefined)
        return chain_var

    // variable was not found :(
    throw new Error("[VTL] " +name + " is not defined")
}

function findInStack(name)
{
    let stack = getScope(localvarstack_scope)
    let value;
    for (let scope of stack)
    {
        if (scope[name] != undefined)
        {
            value = scope[name]
        }
    }
    return value;
}

function setInScope(scope_name, varname, value)
{
    let scope = getScope(scope_name, {});
    scope[varname] = value;
}

function setScope(scope, object)
{
    getScope(scope, object);
}

function registerCustomFilter(name, cb)
{
    setInScope(filter_scope, name, cb);
}

// adds local variable to context on stack
function addLocal(name, value)
{
    let stack = getScope(localvarstack_scope);
    let context = stack[stack.length-1];
    // TODO: remove this. stack cant be empty:
    // its initialized before rendering with global context
    if (!context)
    {
        context = stack[0] = {};
    }
    context[name] = value;
    setScope(localvarstack_scope, stack);
}

// add context onto stack
function addOnContextStack()
{
    let scope = getScope(localvarstack_scope, []);
    scope.push({});
}

// remove context from stack
function popContextStack()
{
    let stack = getScope(localvarstack_scope);
    stack.pop();
}

function emptyStack()
{
    let scope = getScope(localvarstack_scope)
    scope = [];
}
