export namespace main {
	
	export class Team {
	    name: string;
	    color: string;
	    buzzer?: string;
	
	    static createFrom(source: any = {}) {
	        return new Team(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.color = source["color"];
	        this.buzzer = source["buzzer"];
	    }
	}

}

