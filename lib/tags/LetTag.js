class LetTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "let";

    constructor(content)
    {
        super(content)
    }

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    evaluate(render_context)
    {
        let cont = this.clean();

        let lvalue="";
        let rvalue="";
        let eq = false;
        let ptr = 0;

        while(ptr < cont.length)
        {
            let char = cont[ptr]
            if (eq){
                rvalue += char
            }
            else if (char === "=")
            {
                eq = true;
            }
            else
            {
                lvalue += char;
            }
            ptr++;
        }
        lvalue = this.normalizeString(lvalue);
        rvalue = this.normalizeString(rvalue);
        console.log("let:", "'" + lvalue + "'", "'" + rvalue + "'");

        let context = Component.getContext(render_context);
        let val = new ExpressionParser(rvalue).parse().evaluate(context);
        addLocal(lvalue, val);
    }

    render(context)
    {
        this.evaluate(context);
        return "";
    }
}
