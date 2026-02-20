export namespace image {
	
	export class CompressResult {
	    data: string;
	    originalSize: number;
	    newSize: number;
	    format: string;
	
	    static createFrom(source: any = {}) {
	        return new CompressResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.originalSize = source["originalSize"];
	        this.newSize = source["newSize"];
	        this.format = source["format"];
	    }
	}

}

export namespace job {
	
	export class Progress {
	    id: string;
	    input: string;
	    output: string;
	    percentage: number;
	    out_time_ms: number;
	    duration_ms: number;
	    speed: string;
	    eta_seconds: number;
	    status: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Progress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.input = source["input"];
	        this.output = source["output"];
	        this.percentage = source["percentage"];
	        this.out_time_ms = source["out_time_ms"];
	        this.duration_ms = source["duration_ms"];
	        this.speed = source["speed"];
	        this.eta_seconds = source["eta_seconds"];
	        this.status = source["status"];
	        this.error = source["error"];
	    }
	}

}

