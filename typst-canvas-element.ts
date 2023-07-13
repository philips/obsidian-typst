export default class TypstCanvasElement extends HTMLCanvasElement {
    static compile: (path: string, source: string, size: number, display: boolean, fontSize: number) => Promise<ImageData>;
    static reportHeight: (height: number) => void;
    static nextId = 0;

    id: string
    abortController: AbortController
    source: string
    path: string
    display: boolean
    resizeObserver: ResizeObserver
    size: number
    math: boolean
    prevHeight: number

    async connectedCallback() {
        if (!this.isConnected) {
            console.warn("Typst Renderer: Canvas element has been called before connection");
            return;
        }

        if (this.display && this.math) {
            this.height = this.prevHeight;
        }

        this.id = "TypstCanvasElement-" + TypstCanvasElement.nextId.toString()
        TypstCanvasElement.nextId += 1
        // this.abortController = new AbortController()

        await this.draw()
        this.prevHeight = this.innerHeight
        if (this.display) {
            this.resizeObserver = new ResizeObserver((entries) => {
                if (entries[0]?.contentBoxSize[0].inlineSize !== this.size) {
                    this.draw()
                }
            })
            this.resizeObserver.observe(this.parentElement!.parentElement!)
        }
    }

    disconnectedCallback() {
        if (this.display && this.math) {
            TypstCanvasElement.reportHeight(this.prevHeight)
        }
        if (this.display && this.resizeObserver != undefined) {
            this.resizeObserver.disconnect()
        }
    }

    async draw() {
        
        // await navigator.locks.request(this.id, () => {})

        let fontSize = parseFloat(this.getCssPropertyValue("--font-text-size"))
        this.size = this.display ? this.parentElement!.parentElement!.innerWidth : parseFloat(this.getCssPropertyValue("--line-height-normal")) * fontSize

        // resizeObserver can trigger before the element gets disconnected which can cause the size to be 0
        // which causes a NaN
        if (this.size == 0) {
            return;
        }


        
        let image: ImageData;
        let ctx = this.getContext("2d")!;
        try {
        image =
            await TypstCanvasElement.compile(this.path, this.source, this.size, this.display, fontSize)
        } catch (error) {
            console.error(error);
            this.outerText = error
            return
        }

        if (this.display) {
            this.style.width = "100%"
            this.style.height = ""
        } else {
            this.style.verticalAlign = "bottom"
            this.style.height = `${this.size}px`
        }
        this.width = image.width
        this.height = image.height

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.putImageData(image, 0, 0);
    }
}