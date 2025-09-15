using System.Collections.Generic;
class SampleItems{
public class Item{
	public string Name{get; set;}
	public string Desc{get; set;}
	public Dictionary<string, string> Properties{get; set;}
	public bool HasProperty(string name){
		foreach(string p in this.Properties.Keys){
			if(p == name) return true;
		}
		return false;
	}
	}

public static List<Item> MakeSamples(){
	return new List<Item>{
	new Item{
		Name = "Wrench",
	     	Desc = "A wrench used to do things!",
		Properties = new Dictionary<string, string>(){
			["Size"] = "50in"
		}
	},
	new Item{
		Name = "Book",
		Desc = "A cool book!",
		Properties = new Dictionary<string, string>(){
			["Size"] = "12in",
			["Chapters"] = "7"
		}
	}
};
}
};
// { desc = "A wrench used to do things!", properties = {size = "50in"}}; book = { desc = "A cool book!", properties = {size = "12in"}}},
