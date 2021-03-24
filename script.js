const filter_scope = "vtl.filters";
const localvarstack_scope = "vtl.locals"

class ClassNameResolver
{
    static resolve(name)
    {
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

function setInScope(scope, varname, value)
{
    getScope(scope)[varname] = value;
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
        this.parser = new Parser(template);
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
        console.log("add to stack");
        addOnContextStack();

        let html = "";
        for (let renderable of this.content)
        {
            console.log("render", renderable);
            html += renderable.render(context);
        }

        popContextStack();
        console.log("pop from stack");
        return html;
    }
}



class Parser extends ClassNameResolver
{

    constructor(content, ptr)
    {
        super();
        this.ptr = ptr || 0;
    	this.content = content;
        this.line = 0;
    }

    getDebugTextPeek()
    {
        return this.content.substring(
            Math.max(0, this.ptr-50),
            Math.min(this.content.length-1, this.ptr+50)
        );
    }

    hasNext()
    {
        return this.ptr < this.content.length;
    }

    next()
    {
        this.ptr++;
        if (this.get() == "\n")
        {
            this.line++;
        }
    }

    get()
    {
        return this.content[this.ptr];
    }

    // returns tag object or false
	hasTagNext(tagClass)
    {
        if (!tagClass || typeof tagClass != "function")
        {
            throw new Error("tag object can't be " + tagClass)
        }

        let inner = "";
        let ptr = this.ptr;

        let open_seq = tagClass.getTagStart();
        let seq_len = this.hasSequenceNext(open_seq, ptr)

        if (seq_len)
        {
            //ptr += seq_len;
            while(!this.hasSequenceNext(tagClass.getTagEnd(), ptr))
            {
                let char = this.content[ptr];
                if (ptr == this.content.length)
                {
                    throw new Error("Parse Error")
                }

                inner += char;
                ptr++;
            }
            return new tagClass(inner + tagClass.getTagEnd());
        }
        return false;
    }

	// for example {% if %} tag has {% else %} or {% else if %} or {% endif %}
	compoundHasRelatedTagNext(block)
    {
        if (!block)
        {
            print("block class is null", "red");
            return false;
            //throw new Error("trying to read next tag when there is no tag")
        }
        let mainTag = this.constructor.resolve(block.constructor.mainTagClass);


		for (let tagClass of mainTag.related_tags) {
            let cls = this.constructor.resolve(tagClass);
            let tag = this.hasTagNext(cls);
			if (tag){
				return tag
            }
        }
		return this.constructor.resolve(mainTag?.getClosingClass()) &&
        this.hasTagNext( this.constructor.resolve(mainTag.getClosingClass()) )
    }

    // returns whole tag constructon wrapped in tag obj:
    // {% a + b %}
	readTag(leave_ptr_where_it_is)
    {
		let content = ""
        let tag = TagManager.getTagClass(this.content, this.ptr);
        let ptr = this.ptr;

        let tag_end_sequence = tag.getTagEnd();
		while (ptr < this.content.length)
		{

            let char = this.content[ptr];
            let squence_len = this.hasSequenceNext(tag_end_sequence, ptr);

            if (squence_len)
            {
                content += tag_end_sequence;

                // jump over end tag
                ptr += squence_len;

                if (!leave_ptr_where_it_is)
                {
                     // add one so pointer points to new char
                     // and not to closing tag
                     this.ptr = ptr+1;
                }

                let tagObj = new tag(content);

                print(`tag read done at line: ${this.line}`, "green")
                console.log(tagObj);

                return tagObj;
            }
			content += char;
			ptr++
		}

        throw new Error("parse Error");

    }

    // does not change actual ptr
    hasSequenceNext(sequence, _ptr)
    {
        //console.log("check seq", sequence, "in",  this.content.substring(_ptr || this.ptr));
        let tag_check_idx = 0;
        let ptr = _ptr || this.ptr;
        let something_matched = false;
        while(ptr < this.content.length)
        {
            if (tag_check_idx == sequence.length )
            {
                // compensate plus at the end of loop
                ptr--;
                break; // full sequence checked
            }

            let char = this.content[ptr];

            if (char == " " && something_matched)
            {
                ptr++;
                continue;
            }

            if (sequence[tag_check_idx] != char)
            {
                return false;
            }
            something_matched = true;
            tag_check_idx++;
            ptr++;
        }

        // 0 or diff betw start and end
        // (acual length of sequence cuz it can vary bec of spaces)
        if (tag_check_idx == sequence.length)
        {
            //print("found", "green");
            return ptr - (_ptr || this.ptr);
        }
        return false;

    }

    // returns full tag without moving ptr
	peekReadTag() {
        return this.readTag(true);
    }

    // reads everything from tag to start of other tag
    // so next call to readCompound will start at tag for sure
	readCompound(block)
    {
        // we know there is tag at the start
        let headTag = this.readTag();
        let compound = headTag.createCompound();
        let html = "";
        let contentRenderable = new RenderableContent();


		while(this.hasNext())
        {
            let char = this.get();
			this.tag_class = TagManager.getTagClass(this.content, this.ptr);

            if (this.tag_class) {

                // recursively read compund to exclude situations when
                // closing tag of inner compound closes outer compound
                if (this.tag_class.isCompoundStart())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html))
                    contentRenderable.add(this.readBlock());
                    html = "";
                }

                // parse tags that are not compounds
                else if (!this.tag_class.isCompoundable())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html));
                    contentRenderable.add(this.readTag());
                    html = "";
                }
            }

			if (this.compoundHasRelatedTagNext(block))
            {
                contentRenderable.add(new RenderableHtmlWrapper(html));

				compound.head = headTag
				compound.content = contentRenderable;
                //console.log("end of compound: ", compound);
				return compound;
			}

            // make sure not to save first char of tag
            // todo FIX THIS MESS
            if (!this.tag_class)
            {
                html += char;
                this.next();
            }
        }
        throw new Error("reached end while serching for closing tag\nyor template is bad")
    }


	readBlock()
	{
		let opening_tag = this.peekReadTag();
        let blockClass = BlockManager.getBlockClass(opening_tag.constructor);
        let block = new blockClass();

        print("======= read block " + blockClass.name + " =======", "green");

		while (!this.peekReadTag().constructor.isCompoundEnd())
		{
			let compound = this.readCompound(block)
			block.add(compound)
		}
		this.readTag() // move pointer from end tag
        print("block:", "green");
        console.log(block);
		return block;
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
            let parser = new Parser(content, ptr)

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
