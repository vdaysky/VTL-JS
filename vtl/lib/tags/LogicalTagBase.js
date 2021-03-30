class LogicalTag extends Tag
{
    evaluate(render_context)
    {
        let context = Component.getContext(render_context)
        let expr = this.clean();
        return !!new ExpressionParser(expr).parse().evaluate(context);
    }
}
