export namespace main {
	
	export enum Color {
	    Red = "#E8293C",
	    Blue = "#5596E6",
	    Green = "#00B4A0",
	    Yellow = "#FDD600",
	    Purple = "#AF6EE8",
	    LightBrown = "#D2B0A4",
	    MidBlue = "#305A80",
	    Orange = "#FF9249",
	}
	export class Team {
	    name: string;
	    color: Color;
	    buzzerId?: string;
	
	    static createFrom(source: any = {}) {
	        return new Team(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.color = source["color"];
	        this.buzzerId = source["buzzerId"];
	    }
	}

}

