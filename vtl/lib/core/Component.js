class Component
{
	constructor(template, name)
    {
        this.tag_class;
        this.parser = new TagParser(template);
        this.name = name || "UNKNOWN";
        this.cache = false;
    }

	isCached()
	{
		return this.cache;
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

        if (this.isCached())
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
            // if (this.tag_class){
            //     print(this.tag_class.name, "orange");
            // }
			if (this.tag_class && this.tag_class.isCompoundStart())
            {
                try
                {
                    let block = prs.readBlock()
                    this.cache.push(new RenderableHtmlWrapper(html));
                    html = "";
                    this.cache.push(block);
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
