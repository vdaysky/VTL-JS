class CallOperator extends Operator
{
    static accepts_undefined = "R";
    static runnable = (left, right)=>
    {
        if (right instanceof Array)
            return left(...right);
        else
        {
            return left(right);
        }
    }
    constructor(expr)
    {
        super(expr);
    }

    // this operator is not supposed to be matched in expression/
    // i will construct it manualy if i find brace block
    static matches(e)
    {
        return false;
    }
}
