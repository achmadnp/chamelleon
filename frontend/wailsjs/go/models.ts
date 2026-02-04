export namespace main {
	
	export class ConvertRequest {
	    Filename: string;
	    Data: number[];
	    Format: string;
	
	    static createFrom(source: any = {}) {
	        return new ConvertRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Filename = source["Filename"];
	        this.Data = source["Data"];
	        this.Format = source["Format"];
	    }
	}
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

