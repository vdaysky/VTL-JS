class TagParser extends Parser
{

    constructor(content, ptr)
    {
        super(content, ptr);
    }

    // returns tag object or false
	hasTagNext(tagClass)
    {
        if (!tagClass || typeof tagClass != "function")
        {
            throw new Error("tag object can't be " + tagClass)
        }

        let inner = "";
        let ptr = this.ptr;

        let open_seq = tagClass.getTagStart();
        let seq_len = this.hasSequenceNext(open_seq, ptr)

        if (seq_len)
        {
            //ptr += seq_len;
            while(!this.hasSequenceNext(tagClass.getTagEnd(), ptr))
            {
                let char = this.content[ptr];
                if (ptr == this.content.length)
                {
                    throw new Error("Parse Error")
                }

                inner += char;
                ptr++;
            }
            return new tagClass(inner + tagClass.getTagEnd());
        }
        return false;
    }

	// for example {% if %} tag has {% else %} or {% else if %} or {% endif %}
	compoundHasRelatedTagNext(block)
    {
        if (!block)
        {
            print("block class is null", "red");
            return false;
            //throw new Error("trying to read next tag when there is no tag")
        }
        let mainTag = this.constructor.resolve(block.constructor.mainTagClass);


		for (let tagClass of mainTag.related_tags) {
            let cls = this.constructor.resolve(tagClass);
            let tag = this.hasTagNext(cls);
			if (tag){
				return tag
            }
        }
		return this.constructor.resolve(mainTag?.getClosingClass()) &&
        this.hasTagNext( this.constructor.resolve(mainTag.getClosingClass()) )
    }

    // returns whole tag constructon wrapped in tag obj:
    // {% a + b %}
	readTag(leave_ptr_where_it_is)
    {
		let content = ""
        let tag = TagManager.getTagClass(this.content, this.ptr);
        let ptr = this.ptr;

        let tag_end_sequence = tag.getTagEnd();
		while (ptr < this.content.length)
		{

            let char = this.content[ptr];
            let squence_len = this.hasSequenceNext(tag_end_sequence, ptr);

            if (squence_len)
            {
                content += tag_end_sequence;

                // jump over end tag
                ptr += squence_len;

                if (!leave_ptr_where_it_is)
                {
                     // add one so pointer points to new char
                     // and not to closing tag
                     this.ptr = ptr+1;
                }

                let tagObj = new tag(content);

                print(`tag read done at line: ${this.line}`, "green")
                console.log(tagObj);

                return tagObj;
            }
			content += char;
			ptr++
		}

        throw new Error("parse Error");

    }

    // returns full tag without moving ptr
	peekReadTag() {
        return this.readTag(true);
    }

    // reads everything from tag to start of other tag
    // so next call to readCompound will start at tag for sure
	readCompound(block)
    {
        // we know there is tag at the start
        let headTag = this.readTag();
        let compound = headTag.createCompound();
        let html = "";
        let contentRenderable = new RenderableContent();


		while(this.hasNext())
        {
            let char = this.get();
			this.tag_class = TagManager.getTagClass(this.content, this.ptr);

            if (this.tag_class) {

                // recursively read compund to exclude situations when
                // closing tag of inner compound closes outer compound
                if (this.tag_class.isCompoundStart())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html))
                    contentRenderable.add(this.readBlock());
                    html = "";
                }

                // parse tags that are not compounds
                else if (!this.tag_class.isCompoundable())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html));
                    contentRenderable.add(this.readTag());
                    html = "";
                }
            }

			if (this.compoundHasRelatedTagNext(block))
            {
                contentRenderable.add(new RenderableHtmlWrapper(html));

				compound.head = headTag
				compound.content = contentRenderable;
                //console.log("end of compound: ", compound);
				return compound;
			}

            // make sure not to save first char of tag
            // todo FIX THIS MESS
            if (!this.tag_class)
            {
                html += char;
                this.next();
            }
        }
        throw new Error("reached end while serching for closing tag\nyor template is bad")
    }

	readBlock()
	{
		let opening_tag = this.peekReadTag();
        let blockClass = BlockManager.getBlockClass(opening_tag.constructor);
        let block = new blockClass();

        print("======= read block " + blockClass.name + " =======", "green");

		while (!this.peekReadTag().constructor.isCompoundEnd())
		{
			let compound = this.readCompound(block)
			block.add(compound)
		}
		this.readTag() // move pointer from end tag
        print("block:", "green");
        console.log(block);
		return block;
	}
}

class ExpressionParser extends Parser
{
    constructor(expression, ptr, parser_nesting_level_debug=0)
    {
        super(expression, ptr);
        this.parsed = []
        this.nesting_level = parser_nesting_level_debug;
        this.text_buffer = "";
    }

    saveBuffer()
    {
        if (!this.text_buffer)
            return;

        console.log("save buffer:", this.text_buffer);
        try
        {
            let operand = Operand.construct(this.text_buffer);
            this.addElement(operand);
        }
        catch(e)
        {
            if (this.operator_grab_failed)
            {
                console.log("at " + this.getDebugTextPeek() + "\n" + this.ptr + " : " + this.line);
                throw e
            }

            let parser = new ExpressionParser(this.text_buffer);
            parser.operator_grab_failed = true;
            let expr = parser.parse();
            console.log("expr:", expr);
            for (let part of expr.content)
                this.addElement(part);
        }
        this.text_buffer = ""
    }

    clearTextBuffer()
    {
        this.text_buffer = "";
    }

    addToTextBuffer(text)
    {
        this.text_buffer += text;
    }

    fork()
    {
        let parser = new ExpressionParser(this.content, this.ptr, this.nesting_level+1);
        return parser;
    }

    last(idx)
    {
        return this.parsed[this.parsed.length-(!idx?1:idx+1)];
    }


    addElement(elem)
    {
        if (elem instanceof RoundBracketBlock)
        {
            //if (this.content)
            // expression + braces = function call
            if (this.last() instanceof Operand || this.last() instanceof Expression)
            {
                if (this.last(1) instanceof NewOperator)
                {
                    let brace = elem;
                    let callable = this.parsed.pop();
                    let newoperator = this.parsed.pop();
                    this.parsed.push(callable);
                    this.parsed.push(newoperator);
                    this.parsed.push(brace);
                    return;
                }
                else
                {
                    this.parsed.push(new CallOperator());
                }
            }
        }
        this.parsed.push(elem);
    }

    testGrabOperator()
    {
        for (let operatorClass of Operator.registeredInstances)
        {

            let cls = Operator.resolve(operatorClass);
            let offset = this.hasSequenceNext(cls.sign, this.curptr());

            if (offset !== false)
            {
                // jump over operator
                this.ptr += offset;
                return new cls();
            }
        }
    }

    testGrabBrace()
    {
        if (!BraceBlock.isOpenBrace(this.get()))
            return false;

        let cls = BraceBlock.getType(this.get());


        let braceParser = this.fork();

        // jump over that brace
        braceParser.next();
        while(braceParser.hasNext())
        {
            let char = braceParser.get();

            if (BraceBlock.isOpenBrace(char))
            {
                braceParser.saveBuffer();
                let block = braceParser.testGrabBrace();
                braceParser.addElement(block);
            }
            else if (BraceBlock.isCloseBrace(char))
            {
                braceParser.saveBuffer();
                this.ptr = braceParser.ptr;
                braceParser.next()
                return new cls(braceParser.parsed);
            }
            else
            {
                braceParser.addToTextBuffer(char);
            }
            braceParser.next()
        }
        throw new Error("Closing brace not found");
    }

    parse()
    {
        this.clearTextBuffer();
        let quoted_text = "";
        let quote = false;

        while(this.hasNext())
        {
            let char = this.get();

            if ( (char == " " || char == "\n") && !quote)
            {
                this.saveBuffer();
                this.next();
                continue;
                // let lookaheadparser = this.fork();
                // // spaces between current position and letter
                // // returns false if there is no letter after space
                // let offset = lookaheadparser.hasAfterSpaces(/^[A-z_]/);
                //
                // if (offset !== false)
                // {
                //     console.log("%cspace found. offset: " + offset, "color:green");
                //     //alert("space with char " + offset)
                //     //add single space and jump over
                //     //this.addToTextBuffer(" ");
                //     this.ptr += offset;
                //     continue;
                // }
                // else
                // {
                //     // jump over all spaces
                //     let o = lookaheadparser.hasAfterSpaces(/^./);
                //     this.ptr += o;
                // }
            }

            //console.log("[" + this.nesting_level + "]" + " (#" + (this.curptr()) + ") " + char);

            // TODO escape quotes
            if (char == '"')
            {
                quote = !quote

                if(!quote)
                {
                    this.addElement(new StringLiteral(quoted_text));
                }
                else
                {
                    this.saveBuffer();
                }
                this.next();
                continue;
            }

            if(quote)
            {
                quoted_text += char;
                this.next();
                continue;
            }

            // check for operators
            let operator = this.testGrabOperator();
            if (operator)
            {
                this.saveBuffer();
                this.addElement(operator);
                this.next();
                continue;
            }

            // check for brace blocks
            let brace_block = this.testGrabBrace();
            if(brace_block)
            {
                this.saveBuffer();
                this.addElement(brace_block);
                this.next();
                continue;
            }

            this.addToTextBuffer(char);
            this.next();
        }
        this.saveBuffer();
        return new ParsedExpression(this.parsed);
    }
}
