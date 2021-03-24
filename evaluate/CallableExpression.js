class CallableExpression extends Expression
{
    static regex = /\b[A-aZ-z]+\((.*)\)/;
    constructor(expression)
    {
        super(expression)
    }

    getCallableName()
    {
        let name_regex = /.*(?=\()/
        return this.expression.match(name_regex)[0];
    }

    getParams()
    {
        let args_group_regex = /\((.*)\)/
        let brace_group = this.expression.match(args_group_regex)[1];
        return brace_group;
    }
    evaluate(context)
    {
        let callable = getValue(getCallableName(), context);
        let args = [];
        for (let arg_expr of getParams.split(","))
        {
            let expr = Expression.construct(arg_expr);
            args.push(expr.evaluate(context));
        }
        callable(...args);
    }
}
