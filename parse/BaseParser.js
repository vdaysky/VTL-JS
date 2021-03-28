class Parser extends ClassNameResolver
{
    constructor(content, ptr)
    {
        super();
        this.ptr = ptr || 0;
    	this.content = content;
        this.line = 0;
    }

    hasNext()
    {
        return this.ptr < this.content.length;
    }

    next()
    {
        if (this.get() == "\n")
        {
            this.line++;
        }
        return this.content[this.ptr++];
    }

    left()
    {
        return this.content.substr(this.ptr);
    }

    curptr()
    {
        return this.ptr - 1;
    }
    get()
    {
        return this.content[this.curptr()];
    }

    getDebugTextPeek()
    {
        return this.content.substring(
            Math.max(0, this.ptr-50),
            Math.min(this.content.length-1, this.ptr+50)
        );
    }

    // does not change actual ptr
    hasSequenceNext(sequence, _ptr)
    {
        //console.log("check seq", sequence, "in",  this.content.substring(_ptr || this.ptr));
        let tag_check_idx = 0;
        let ptr = _ptr !== undefined ? _ptr : this.ptr;
        let something_matched = false;
        while(ptr < this.content.length)
        {
            if (tag_check_idx == sequence.length )
            {
                // compensate plus at the end of loop
                ptr--;
                break; // full sequence checked
            }

            let char = this.content[ptr];

            if (char == " " && something_matched)
            {
                ptr++;
                continue;
            }
            if (sequence[tag_check_idx] != char)
            {
                return false;
            }
            something_matched = true;
            tag_check_idx++;
            ptr++;
        }

        // 0 or diff betw start and end
        // (acual length of sequence cuz it can vary bec of spaces)
        if (tag_check_idx == sequence.length)
        {
            //print("found", "green");
            return ptr - (_ptr || this.ptr);
        }
        return false;

    }
}
