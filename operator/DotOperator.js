class DotOperator extends Operator
{
    static runnable = (l, r)=>l[r];
    static sign = ".";
    static priority = 10;

    static use_raw_right = true;

    constructor()
    {
        super();
    }
}
