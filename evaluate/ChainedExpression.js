class ChainedExpression extends Expression
{
    // string
    constructor(expression)
    {
        super(expression);
    }

    evaluate(context)
    {
        let parts = expression.split(".");

        let obj;
        for (part of parts)
        {
            let expr = Expression(part);
            obj = expr.evaluate(context);
            context.__chain_parent = obj;
        }
        return obj;
    }

    // cant be done with regex cuz of brace parsing
    static matches(expression)
    {
        return false;
    }
}
