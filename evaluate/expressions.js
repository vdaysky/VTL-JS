// class Evaluator
// {
//     static function_call_regex = ""
//     static brace_content_regex = "\\(.*\\)"
//
//     // parses (a, b) as [1, 2]
//     static parse_arg_list(expression, context)
//     {
//         let args = [];
//         for (let expr of expression.split(","))
//         {
//             let value = Evaluator.evalueate(expr, context);
//             args.push(value);
//         }
//     }
//     static isCall(expression)
//     {
//         // return matchers regex
//     }
//
//     static call(parent, method, context)
//     {
//         let arg_list = somehow get arg list (method)
//         let method_name = somehow get method name (method)
//         let args = parse_arg_list(arg_list)
//         let method = parent[method_name]
//
//         return method.call(arg_list)
//     }
//
//     static evalueate_chained(expression, context)
//     {
//         // abc.def.ghl().def.abc
//         if (expression.include("."))
//         {
//             let parts = expression.split(".");
//             let parent = parts[0];
//             for (let part of parts[1:])
//             {
//                 if (isCall(part))
//                 {
//                     call(parent, part, context)
//                 }
//                 else if(isVarName(part)){
//                     parent = parent[part]
//                 }
//                 else{
//                     throw new Error("error while parsing chained");
//                 }
//             }
//         }
//     }
//
//     static evaluate(expression, context)
//     {
//
//     }
// }
//
// class EvaluationResult
// {
//     constructor(value)
//     {
//         this.value = value;
//     }
//
//     asBool()
//     {
//         return !!this.value;
//     }
//     asInt()
//     {
//         return parseInt(this.value);
//     }
//     asString()
//     {
//         return parseStr(this.value);
//     }
//     auto()
//     {
//         return this.value;
//     }
// }
