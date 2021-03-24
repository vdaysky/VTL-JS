class Expression extends ClassNameResolver
{
    static registeredExprTypes = ["VariableExpression", "ChainedExpression", "CallableExpression"];

    constructor(expression)
    {
        super();
        this.expression = expression;
        console.log("expresion creted: ", expression);
        if (!this.constructor.matches(expression))
        {
            throw new Error("Tried to parse exprassion as wrong type");
        }
    }

    eval(context) {
        throw new Error("Not Implemented");
    }

    static construct(expression)
    {
        for (let classType of this.registeredExprTypes)
        {
            console.log("check class", classType);
            let cls = this.resolve(classType);
            console.log("match: ", cls.matches(expression));
            if (cls.matches(expression))
            {
                return new cls(expression)
            }
        }
        throw new Error("Unxepected expression: " + expression);
    }

    static matches(expr)
    {
        if (this.regex)
            return this.regex.test(expr);
        throw new Error('Not Implemented')
    }
}
