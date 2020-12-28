const UserModel = firebase.auth();
const DB = firebase.firestore();



const app = Sammy('#container', function () {
    this.use('Handlebars', 'hbs');

    this.get('#/home', function(context) {

        DB.collection('destinations').get()
            .then((response) => {
                 let user = getUserData();
                 let email;
                 if(user !== null){
                    email = user.email;
                 }
                
                context.destinations = response.docs.map((destination) => {return {id:destination.id, ... destination.data()}});
                 extendContext(context)
                    .then(function (){
                        this.partial('./templates/home.hbs')
                    })
                })
    })
    this.get('#/create', function(context) {
        extendContext(context)
            .then(function() {
                this.partial('./templates/create.hbs')
            })
    })
    this.post('#/create', function(context){
        const {destination, city, duration, departureDate,imgUrl} = context.params;

        if(Number(duration < 1) || Number(duration > 100)){
            return;
        }
        if(destination === '' || city === '' || duration === '' || departureDate === '' || imgUrl === ''){
            return;
        }
        const user = getUserData();
        const uid = user.uid;
        DB.collection('destinations').add({
            destination,
            city,
            duration,
            departureDate,
            imgUrl,
            Owner:uid,
            OwnerEmail:user.email
        })
            .then(response => {
                localStorage.setItem('userInDb',response.id);
                this.redirect('#/home');
            })

    })

    this.get('#/details/:id', function(context) {

        let id = context.params.id;
        context.id = id;
        let userId = localStorage.getItem('userInDb');
                if(id === userId){
                    context.isCreator = true;
                }
                else{
                    context.isCreator = false;
                }

        DB.collection('destinations').doc(id).get()
            .then((destination) => {
                context.city = destination.data().city;
                context.destination = destination.data().destination;
                context.duration = destination.data().duration;
                context.departureDate = destination.data().departureDate;
                context.imgUrl = destination.data().imgUrl;
                extendContext(context)
                    .then(function() {
                        this.partial('./templates/details.hbs')
                    })
            })
        
    })
    this.get('#/detailsDashboard', function(context) {
        let userId = getUserData().uid;
    
        let destinations = [];
        DB.collection('destinations')
        .get().then(function(querySnapshot) {
            querySnapshot.forEach(function(doc){
                let dataOwner = doc.data().Owner;
                if(dataOwner === userId){
                    let obj = {id:doc.id,city:doc.data().city,departureDate:doc.data().departureDate,destination:doc.data().destination,duration:doc.data().duration,imgUrl:doc.data().imgUrl,isCreator:true}
                    destinations.push(obj);
                }
            })
            context.destinations = destinations;
            extendContext(context)
                .then(function (){
                    this.partial('./templates/detailsDashboard.hbs')
                })
                
        })
        /*
        DB.collection('destinations').get()
        .then((response) => {
             let user = getUserData();
             let email;
             if(user !== null){
                email = user.email;
             }
                
                
            context.destinations = response.docs.map((destination) => {return {id:destination.id, ... destination.data()}});
             extendContext(context)
                .then(function (){
                    this.partial('./templates/detailsDashboard.hbs')
                })
            })
            */
    })
    this.get('#/edit/:id', function(context) {
        let id = context.params.id;
        DB.collection('destinations')
            .doc(id)
            .get()
            .then(response => {
                
                context.destination = response.data().destination;
                context.city = response.data().city;
                context.duration = response.data().duration;
                context.departureDate = response.data().departureDate;
                context.imgUrl = response.data().imgUrl;
                extendContext(context)
                    .then(function() {
                        this.partial('./templates/edit.hbs')
                    })
            })
    })
    this.post('#/edit/:id',function(context){
        let id = context.params.id;
        let {destination, city, duration,departureDate,imgUrl} = context.params;
        let user = getUserData();
        let uid = user.uid;
        if(destination === '' || city === '' || duration === '' || departureDate === '' || imgUrl === ''){
            return;
        }
        if(Number(duration < 1) || Number(duration > 100)){
            return;
        }
        DB.collection('destinations').doc(id).set({
            destination,
            city,
            duration,
            departureDate,
            imgUrl,
            Owner:uid,
            OwnerEmail:user.email
        })
            .then(response =>  {
                this.redirect('#/home')
            })
            .catch(e => console.log(e))
    })
    this.get('#/login', function(context) {
        extendContext(context)
            .then(function() {
                this.partial('./templates/login.hbs')
            })
    })
    this.post('#/login', function(context){
        const {email, password} = context.params;

        UserModel.signInWithEmailAndPassword(email, password)
            .then(response => {
                saveUserData(response);
                localStorage.setItem('isLoggedIn',true)
                this.redirect('#/home');
                
            })
            .catch(e => console.log(e));
    })

    this.get('#/register', function(context) {
        extendContext(context)
            .then(function() {
                this.partial('./templates/register.hbs')
            })
    })

    this.post('#/register',function(context){
        const {email , password, rePassword} = context.params;

        if(password !== rePassword){
            return;
        }

        if(email.length <= 6){
            return
        }

        UserModel.createUserWithEmailAndPassword(email, password)
        .then((response) => {
            saveUserData(response);
            localStorage.setItem('isLoggedIn',true)
            this.redirect('#/home');
        })
        .catch(e => console.log(e))


    })

    this.get('#/logout', function(context) {
        UserModel.signOut()
            .then(response => {
                localStorage.clear();
                localStorage.setItem('isLoggedIn',false);
                this.redirect('#/home')
            })
            .catch(e=> console.log(e))
    })
    this.get('#/remove/:id', function(context) {
        let id = context.params.id;
        
        DB.collection('destinations')
            .doc(id)
                .delete()
                    .then(response =>{
                        this.redirect('#/home')
                    })
                    .catch(e => console.log(e))
    })
});

(() =>{
    app.run('#/home')
})();

function extendContext(context) {
    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.email = user ? user.email : '';

    return context.loadPartials({
        'header': '/partials/header.hbs',
        'footer': '/partials/footer.hbs'
    })
}
function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }))
}

function getUserData() {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user) : null;
}

function clearUserData() {
    this.localStorage.removeItem('user');
}

