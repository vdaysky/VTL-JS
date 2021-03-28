class Operand extends ClassNameResolver
{
    static registeredInstances = [
        "VariableOperand",
        //"Enumeration",
        "StringLiteral",
        "NumberLiteral",
        //"AnyOperand"
    ];

    constructor(expression)
    {
        super();

        //if (! (expression instanceof Array))
        //    throw new Error("Expressions must be parsed list");

        this.expression = expression;
        console.log("expresion creted:", expression);
    }

    static construct(expression)
    {
        for (let classType of this.registeredInstances)
        {
            let cls = this.resolve(classType);

            if (cls.matches(expression))
            {
                console.log("unit", expression, "is", cls.name);
                return new cls(expression)
            }
        }
        throw new Error("Unxepected expression: " + expression);
    }

    static matches(expr)
    {
        console.log("test", expr, "against", this.name);
        if (this.regex){
            return this.regex.test(expr);
        }
        throw new Error('Not Implemented')
    }

    static getType(operator)
    {
        for (let unitType of this.registeredUnits)
        {
            let resolvedUnit = this.resolve(unitType);
            for (let cls of resolvedUnit.registeredInstances)
            {
                if(cls.matches(operator))return cls;
            }
        }
        throw new Error("Unsupported operator: " + operator);
    }

    evaluate(context)
    {
        throw new Error("Not Implemented");
    }
}
