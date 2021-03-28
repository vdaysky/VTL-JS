class Literal extends Operand
{
    static literals = ["StringLiteral", "NumberLiteral"]
    constructor(value)
    {
        super(value)
    }

    evaluate(context)
    {
        return this.expression;
    }

    static construct(expr)
    {
        for (let literalClass of this.literals)
        {
            let cls = this.resolve(literalClass)

            if (cls.matches(expr.expression))
            {
                return new cls(expr.expression);
            }
        }
    }
}

class StringLiteral extends Literal
{
    static regex = /"[A-aZ-z_]+[A-aZ-z0-9_]*"/;
    constructor(text)
    {
        super(text)
    }
}

class NumberLiteral extends Literal
{
    static regex = /^[0-9]+\.*[0-9]*$/;
    constructor(number)
    {
        super(parseInt(number))
    }
}

class ArrayLiteral extends Literal
{

}

class ObjectLiteral extends Literal
{

}
