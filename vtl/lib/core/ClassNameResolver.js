class ClassNameResolver
{
    static resolve(name)
    {
        //console.log(name);
        return eval(name);
    }

    static resolveAll(list)
    {
        let res = [];
        for (let item of list)
        {
            res.push(this.resolve(item));
        }
        return res;
    }
}
