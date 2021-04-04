class TagManager extends ClassNameResolver
{
    // execute tag should be last since it does not have prefix.
    // that means execute tag will match anything
    static registered_tags = [
        "LetTag", "IncludeTag", "ExecuteTag",
        "IfTag", "EndIfTag", "ElseIfTag", "ElseTag",
        "ForTag", "EndForTag"
    ];
    static resolved_cache = false;

    static getTagClass(content, ptr)
    {
        if (this.resolved_cache)
        {
            for (let tagClass of this.resolved_cache)
            {
                let parser = new TagParser(content, ptr)

                let cls = this.resolve(tagClass);
                if (parser.hasTagNext(cls))
                {
                    return cls;
                }
            }
        }
        else
        {
            this.resolved_cache = this.resolveAll(this.registered_tags);
            return this.getTagClass(content, ptr);
        }

        return false;
    }
}
