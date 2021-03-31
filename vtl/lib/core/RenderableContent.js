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
        addOnContextStack();

        let html = "";
        for (let renderable of this.content)
        {
            html += renderable.render(context);
        }

        popContextStack();
        return html;
    }
}
