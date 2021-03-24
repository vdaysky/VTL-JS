class Tag extends ClassNameResolver
{
    // some static things here
    static related_tags = ["not Implemented"]
    static modifier = "not Implemented";
    static tag_name = "not Implemented";
    static compoundClass = "Compound";
    static closeTagClass = null;
    static mainTagClass = null;

    static tagEndPrefix = "end";

    constructor(content)
    {
        super();
        this.content = content;
    }

    static isCompoundStart()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundEnd()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundable()
    {
        return !!(this.resolve(this.mainTagClass)?.compoundClass);
    }

    // returns opening of tag: {% if
    static getTagStart()
    {
        return `{${this.modifier}${this.isCompoundEnd()?this.tagEndPrefix:""}${this.tag_name}`
    }

    // returns closing part of tag: $}
    static getTagEnd()
    {
        return `${this.modifier}}`
    }

    static getClosingClass()
    {
        return this.resolve(this.closeTagClass);
    }

    createCompound()
    {
        let cls = this.constructor.resolve(this.constructor.compoundClass)
        return new cls();
    }

    clean()
    {
        let clean = "";
        let parser = new Parser(this.content);

        let skip_open_tag = parser.hasSequenceNext(this.constructor.getTagStart());
        let skip_end_tag = false;
        while (skip_end_tag == false && parser.hasNext())
        {
            skip_end_tag = parser.hasSequenceNext(this.constructor.getTagEnd());
            parser.next();
        }

        // idk why +1 needs to be there
        // seems to work tho
        clean = this.content.substring(skip_open_tag+1, this.content.length - skip_end_tag);
        // now we should remove all redunant spaces
        // remove all for now

        clean = clean.replaceAll(" ", "");
        return clean;
    }

    // used to display html and to do additional processing
    render(context)
    {
        throw new Error("Not Implenemted")
    }

    // default evaluation behaviour.
    // will just eval expression within passed context
    evaluate(render_context)
    {
        let context = Component.getContext(render_context);
        return Expression.construct(this.clean()).evaluate(context);
    }
}


class FilteredTag extends Tag
{
    static filterOperator = ">>";

    constructor(content)
    {
        super(content);
        if (content.includes(this.filterOperator))
        {
            this.content = FilteredTag.apply(this.clean());
        }
    }

    static apply(expression)
    {
        let parser = new Parser(expression);

        let pre_filter = "";

        let matches = expression.matchAll(`[^\\s]*\\s*${this.filterOperator}\\s*[^\\s]*`);
        let processed_expr = "";
        let expr_process_end_idx = 0;
        for (let match of matches)
        {
            let match_segment = match[0];
            let first_val = match_segment.match(`^[^\\s]*`)
            let last_val = match_segment.match(`(?<=${this.filterOperator}\\s*)\\S.*`)

            processed_expr += expression.substring(expr_process_end_idx, match.index);
            processed_expr += `${filter_scope}.${last_val}(${first_val})`
            expr_process_end_idx = match.index + match_segment.length;
        }
        return processed_expr;
    }
}

class LogicalTag extends FilteredTag
{
    evaluate(render_context)
    {
        let context = Component.getContext(render_context)
        let expr = this.clean();
        return !!Expression.construct(expr).evaluate(context);
    }
}

class LetTag extends FilteredTag
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
        let parts = cont.split(" ")
        parts.remove("")
        if (parts.length == 3)
        {
            let x_var = parts[0];
            let mode = parts[1];
            let expr = parts[2];

            if (mode == "=")
            {
                let context = Component.getContext(render_context);
                let val = Evaluator.evaluate(expr, context);
                addLocal(x_var, val.auto());
            }
        }
    }

    render(context)
    {
        this.evaluate(context);
        return "";
    }
}

class ForTag extends FilteredTag
{
    static blockClass = "ForBlock";
    static closeTagClass = "EndForTag";
    static mainTagClass = "ForTag";

    static related_tags = []
    static modifier = "$";
    static tag_name = "for";

    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}


class EndForTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "for";
    static mainTagClass = "ForTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}

class ElseIfTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "elseif";
    mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class ElseTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "else";
    static mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class EndIfTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "if";
    static mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}

class ForBlock extends Block
{
    static mainTagClass = "ForTag";
    static iterateOperator = "of"
    static unpackVarnamesRegex = `[^\\s^,]*(?=\\s*[,\\s])`;

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {
            let expr = comp.head.clean()
            if (!expr.includes(ForBlock.iterateOperator))
            {
                return;
            }

            let [lval, rval] = expr.split(ForBlock.iterateOperator)
            let varnames = [];

            for (let vname of lval.matchAll(ForBlock.unpackVarnamesRegex))
            {
                if (vname[0]){
                    varnames.push(vname[0]);
                }
            }
            // {$ for x of y $}

            let iterable = getValue(rval, context);

            for (let packed of iterable)
            {
                if (packed instanceof Array && varnames.length != packed.length)
                {
                    throw new Error(`Expected ${varnames.length} args but got ${packed.length}`)
                }

                for (let [i, varname] of varnames.entries())
                {
                    let value;
                    if (packed instanceof Array)
                    {
                        value = packed[i];
                    }
                    else
                    {
                        value = packed;
                    }
                    context[varname] = value;
                }
                html += comp.content.render(context);
            }
            delete context.temp_iterator;

        }
        return html;
    }
}

class IfBlock extends Block
{
    static mainTagClass = "IfTag";

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {

            let bool = (comp.head instanceof ElseTag) || comp.head.evaluate(context);

            if (bool)
            {
                html += comp.content.render(context);
                break;
            }
        }
        return html;
    }
}

class IfTag extends LogicalTag
{
    static related_tags = ["ElseIfTag", "ElseTag"]
    static modifier = "$";
    static tag_name = "if";
    static closeTagClass = "EndIfTag";
    static mainTagClass = "IfTag";
    static blockClass = "IfBlock";


    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class IncludeTag extends FilteredTag
{
    static related_tags = []
    static modifier = "%";
    static tag_name = "include";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        let template_name = this.clean();
        let component = context[template_name] || window[template_name];
        if (!component)
        {
            return "invalid component";
        }
        return component.render(context);
    }
}

class ExecuteTag extends FilteredTag
{
    static related_tags = []
    static modifier = "%";
    static tag_name = ""; // execute tag does not have any keyword

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        return this.evaluate(context);
    }
}
