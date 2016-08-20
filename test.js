
/*TEST*/
var MP = this.MP;
var CustomType = MP.CustomType;
var d = {
	a: {
		b: [1, 2, 3],
		B: "BBB"
	},
	b: "B"
};
var m = new MP(d);

console.log(m.get("a[b]"), "===", d.a[d.b]);
console.log(m.get("a['b']"), "===", d.a["b"]);
m.set("a['b'].1", "B2");
console.log(m.get("a['b']"));
console.log.apply(console, MP.formatKey("a[$b]", {
	$b: "B"
}))
console.log(m.get("a[$b]", {
	$b: "B"
}));

m.set("me", {
	firstname: "Gaubee",
	lastname: "Bangeel",
	fullname: CustomType("me.firstname+' '+me.lastname"),
	fullname_intelligent: CustomType("__vm.get($pre_path_str+'.firstname')+' '+__vm.get($pre_path_str+'.lastname')",
		"($new_value=$new_value.split(' ')),__vm.set($pre_path_str+'.firstname',$new_value[0]),__vm.set($pre_path_str+'.lastname',$new_value[1]),null")
});

console.log(m.get("me.fullname_intelligent"))
console.log(m.set("me.fullname_intelligent", "GAUBEE BANGEEL"))
console.log(m.get("me.fullname"))