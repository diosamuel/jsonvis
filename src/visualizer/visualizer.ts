import { getMousePosition, resizeSVG } from "../window"
import { SVGNode } from "./node"
import { createElement } from "./utils"

class Visualizer {
    svg: SVGElement 
    cards: SVGElement
    data: any
    rootNode: SVGNode|null = null
    viewbox = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    }

    constructor(svg: SVGElement, data: any) {
        this.svg = svg
        this.cards = svg.querySelector('#cards')!
        this.data = data 

        this.watchSize()
        this.init()
        this.draw()
        this.events()
    }

    /**
     * Create the position object
     */
    init() {
        // Create the root node
        if(Array.isArray(this.data)) {
            this.rootNode = new SVGNode("empty", { x: 200, y:200 }, "")
            return
        }
        
        this.rootNode = new SVGNode("object", { x: 200, y: 200 }, this.data)

        let distanceXFromParent = 100

        const loop = (parent: SVGNode, children?: any[]) => {
            parent.value

            if(typeof parent.value == 'object') {
                for(const key in parent.value) {
                    if(!Array.isArray(parent.value[key]) && typeof parent.value[key] == 'object') {
                        // The value is object.
                        // Create only one child that connected to the parent
                        let newNode = new SVGNode("object", { x: parent.location.x + parent.size.width + distanceXFromParent, y: parent.location.y }, parent.value[key])
                        parent.addChildren(newNode)
                        this.cards.append(newNode.el)
                    } else if(Array.isArray(parent.value[key])) {
                        // The value is array.
                        // Create the extension node with its children in it
                        let extensionNode = new SVGNode("extension", { x: parent.location.x + parent.size.width + distanceXFromParent, y: parent.location.y }, key)
                        parent.addChildren(extensionNode)
                        this.cards.append(extensionNode.el)
                        extensionNode.updateSize()

                        loop(extensionNode, parent.value[key] as any)
                    }
                }
            }

            // Create the `children` if any
            children?.forEach(child => {
                let newNode = new SVGNode("object", { x: parent.location.x + parent.size.width + distanceXFromParent, y: parent.location.y }, child)
                parent.addChildren(newNode)
                this.cards.append(newNode.el)
                loop(newNode)
            }) 

            this.recalculatePosition()
        }


        loop(this.rootNode)
        this.recalculatePosition()
    }

    recalculatePosition() {
        const gapBetweenNode = 50
        const loop = (parent: SVGNode) => {
            let childrenAmount = parent.children.length
            let childTotalHeight = parent.children.reduce((acc, curr) => acc + curr.size.height, 0) 
            let childrenGroupHeight = childTotalHeight + (gapBetweenNode * (childrenAmount - 1))
            let startY = parent.location.y - childrenGroupHeight / 2
            let endY = parent.location.y + childrenGroupHeight / 2

            parent.children.forEach((child, index) => {
                let newY = startY + childrenGroupHeight * ((index+1) / childrenAmount)
                child.updateY(newY)
                loop(child)
            })
        }
        loop(this.rootNode!)
    }

   
    draw(node: SVGNode|null = null) {
        if(node == null) {
            node = this.rootNode!
        } 
        this.cards.append(node.el)
        node.updateSize()
    }

    watchSize() {
        window.addEventListener('resize', resizeSVG)
        
        // set viewbox
        resizeSVG()

        // set default viewbox
        this.viewbox.w = ~~this.svg.getAttribute('width')!
        this.viewbox.h = ~~this.svg.getAttribute('height')!
        this.updateViewbox()
    }

    updateData(data: any) {
        this.data = data 
        this.cards.innerHTML = ""
        this.init()
        this.draw()
    }
    
    updateViewbox() {
        this.svg.setAttribute('viewBox', `${this.viewbox.x} ${this.viewbox.y} ${this.viewbox.w} ${this.viewbox.h}`)
    }

    events() {
        this.draggingEvent()
        this.zoomEvent()
    }

    private zoomEvent() {
        let lastKnownScrollPosition = 0;
        let ticking = false;

        window.addEventListener('wheel', e => {
            let minimumDimension = 300
                e.preventDefault()
                // Do zooming
                this.viewbox.w = this.viewbox.w + e.deltaY < minimumDimension ? minimumDimension : this.viewbox.w + e.deltaY 
                this.viewbox.h = this.viewbox.h + e.deltaY < minimumDimension ? minimumDimension : this.viewbox.h + e.deltaY 

                this.updateViewbox()

                console.log('scrolling', e.deltaY)
        })
    }
    
    private draggingEvent() {
        let isDragging = false 
        let dragFromOffset = {
            x: this.viewbox.x,
            y: this.viewbox.y,
        }
        let mouseDownFrom = {
            x: 0,
            y: 0
        }
        
        this.svg.addEventListener('mousedown', (e) => {
            let mousePos = getMousePosition(this.svg, e)
            mouseDownFrom = mousePos
            isDragging = true
            dragFromOffset = {
                x: this.viewbox.x,
                y: this.viewbox.y,
            }
        })
        
        this.svg.addEventListener('mouseup', (e) => {
            isDragging = false
        })
        
        this.svg.addEventListener('mousemove', (e) => {
            if(!isDragging) return
            let mousePos = getMousePosition(this.svg, e)
            this.viewbox.x = dragFromOffset.x - (mousePos.x - mouseDownFrom.x)
            this.viewbox.y = dragFromOffset.y - (mousePos.y - mouseDownFrom.y)
            
            this.updateViewbox()
        })

    }

}

export const createVisualizer = (svg: SVGElement, data: any) => {
    return new Visualizer(svg, data)
}