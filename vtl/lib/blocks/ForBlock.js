class ForBlock extends Block
{
    static mainTagClass = "ForTag";
    static iterateOperator = "of"
    static unpackVarnamesRegex = `[^\\s^,]*(?=\\s*[,\\s])`;

    render(context)
    {

        console.log("EVAL FOR BLOCK", this);
        let html = "";

        for (let comp of this.compounds)
        {
            let expr = comp.head.clean()
            if (!expr.includes(ForBlock.iterateOperator))
            {
                console.log("no iter operator");
                return;
            }

            let [lval, rval] = expr.split(ForBlock.iterateOperator)
            let varnames = [];
            console.log(expr, "lval and rval", lval, rval);
            for (let vname of lval.matchAll(ForBlock.unpackVarnamesRegex))
            {
                console.log("vnames", vname[0]);
                if (vname[0]){
                    varnames.push(vname[0]);
                }
            }
            console.log("all:", varnames);
            // {$ for x of y $}


            let iterable = new ExpressionParser(rval).parse().evaluate(context)//getValue(rval, context);
            console.log("iterable:", iterable);
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
                    console.log("FOR LOOP CONTEXT: " + varname + " " + value);
                }
                html += comp.content.render(context);
            }
            delete context.temp_iterator;

        }
        return html;
    }
}
