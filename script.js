const filter_scope = "vtl.filters";
const localvarstack_scope = "vtl.locals"

const MOBILE_ONLY=1, DESKTOP_ONLY=2, UNIVERSAL=3;

var ADMIN = true;
var isMobile = () => true;
class CManager
{
    static register(component, name, mode)
    {
        console.log(component, name, mode);
        if (mode == UNIVERSAL ||
           (mode == MOBILE_ONLY && isMobile() ||
            mode == DESKTOP_ONLY && !isMobile()))
            {
                this[name] = component;
                component.name = name;
            }
    }
}

class ClassNameResolver
{
    static resolve(name)
    {
        //console.log(name);
        return eval(name);
    }
}

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
    getScope(localvarstack_scope) = [];
}

function getValue(name, context)
{
    console.log("find variable", name);
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

    if (name.includes("."))
    {
        let path = ""
        let parts = name.split(".")
        let obj;
        let first = true;
        for (let child of parts)
        {
            if (first)
            {
                first = false;
                obj = getValue(child, context);
                continue;
            }
            obj = obj[child];
            if (!obj)
            {
                break;
            }
        }
        if (obj)
        {
            return obj;
        }
    }

    // variable was not found :(
    throw new Error("[VTL] " +name + " is not defined")
    return undefined;
}

class Element
{
    constructor(jq_selector)
    {
        this.__proto__.__proto__ = $(jq_selector);
    }

    addComponent(component, context)
    {
        if (! (component instanceof Component))
        {
            throw new Error("component is not instance of Component")
        }
        let html = component.render(context || {});
        this.append(html);
        return this;
    }
}

function print(msg, color)
{
    console.log(`%c${msg}`, `color:${color}`);
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

class Component
{
	constructor(template, name)
    {
        this.tag_class;
        this.parser = new TagParser(template);
        this.name = name || "UNKNOWN";
        this.cache = false;
    }

    static getContext(render_context)
    {
        let flat = {};
        for (let scope of getScope(localvarstack_scope))
        {
            for (let varname of Object.keys(scope))
            {
                if (scope[varname]){
                    flat[varname] = scope[varname]
                }
            }
        }
        return {...render_context, ...flat};
    }

	render(context)
    {
        let html = "";
        addOnContextStack();

        if (this.cache)
        {
            for (let renderable of this.cache)
            {
                html += renderable.render(context);
            }
            return html;
        }
        this.cache = [];

        let prs = this.parser;

		while (prs.hasNext())
        {
            let prtag = this.tag_class;
			this.tag_class = TagManager.getTagClass(prs.content, prs.ptr)

            let char = prs.get();
            if (this.tag_class){
                print(this.tag_class.name, "orange");
            }
			if (this.tag_class && this.tag_class.isCompoundStart())
            {
                try
                {
                    let block = prs.readBlock()
                    this.cache.push(new RenderableHtmlWrapper(html));
                    html = "";
                    this.cache.push(block);
    				//html += block.render(context)
                    console.log("block: ", block);
                }
                catch (e)
                {
                    console.log("could not parse block");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }

            }
			else if (this.tag_class)
            {
                try{
                let tag = prs.readTag()
                console.log("standalone tag: ", tag);
				//html += tag.render(context);
                this.cache.push(new RenderableHtmlWrapper(html));
                html = "";
                this.cache.push(tag);
                }
                catch (e)
                {
                    console.log("could not parse Tag:");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }
            }
            else
            {
                html += char;
                prs.next();
            }
        }
        if (html)
            this.cache.push(new RenderableHtmlWrapper(html));

		return this.render(context);
    }
}

// this class stores renderable wrappers for html, tags and blocks
// used by blocks to store its content
class RenderableContent
{
    constructor(renderables)
    {
        this.content = renderables || [];
    }

    add(renderable)
    {
        this.content.push(renderable);
    }

    render(context)
    {
        console.log("add local stack scope");
        addOnContextStack();

        let html = "";
        for (let renderable of this.content)
        {
            console.log("render", renderable);
            html += renderable.render(context);
        }

        popContextStack();
        console.log("pop local stack scope");
        return html;
    }
}



// this thing is used just to keep data together
class Compound
{
    constructor(head, content)
    {
        if (content && !(content instanceof RenderableContent) )
        {
            throw new Error("content of compound must be RenderableContent instance")
        }
        this.head = head;
        this.content = content;
    }

    render(context)
    {
        return this.head.render(context) + this.content.render(context);
    }
}

class Block
{
    static mainTagClass = null;
    constructor()
    {
        this.compounds = [];
    }

    add(compund)
    {
        this.compounds.push(compund);
    }

    render()
    {
        throw new Error("Not Implenemted")
    }
}

class RenderableHtmlWrapper
{
    constructor(html)
    {
        this.content = html;
    }
    render(context)
    {
        return this.content;
    }
}

// implementations

class TagManager extends ClassNameResolver
{
    // execute tag should be last since it does not have prefix.
    // that means execute tag will match anything
    static registered_tags = [
        "LetTag", "IncludeTag", "ExecuteTag",
        "IfTag", "EndIfTag", "ElseIfTag", "ElseTag",
        "ForTag", "EndForTag"
    ];
    static getTagClass(content, ptr)
    {
        for (let tagClass of this.registered_tags)
        {
            let parser = new TagParser(content, ptr)

            let cls = this.resolve(tagClass);
            if (parser.hasTagNext(cls))
            {
                console.log(content.substring(ptr, ptr+10) + "...", "is", cls.name);
                return cls;
            }
        }
        return false;
    }
}

class BlockManager extends ClassNameResolver
{
    static getBlockClass(tag)
    {
        return this.resolve(this.resolve(tag.mainTagClass).blockClass);
    }
}
