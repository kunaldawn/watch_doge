/*
__        __    _       _       ____   ___   ____ _____
\ \      / /_ _| |_ ___| |__   |  _ \ / _ \ / ___| ____|
 \ \ /\ / / _` | __/ __| '_ \  | | | | | | | |  _|  _|
  \ V  V / (_| | || (__| | | | | |_| | |_| | |_| | |___
   \_/\_/ \__,_|\__\___|_| |_| |____/ \___/ \____|_____|

Ahh I see, you are dev of culture as well.
*/
package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gobuffalo/packr/v2"
	"github.com/googollee/go-socket.io"
	"github.com/hpcloud/tail"
	"github.com/jessevdk/go-flags"
	"log"
	"net/http"
	"strings"
	"time"
)

type Doge struct {
	host         string
	file         string
	socketServer *socketio.Server
	httpServer   *gin.Engine
	tailMap      map[string]*tail.Tail
	lines        int
	includes     []string
	excludes     []string
	box          *packr.Box
}

func NewDoge(host string, file string, lines int, includes []string, exclude []string) *Doge {
	socketServer, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}

	httpServer := gin.New()
	tailMap := make(map[string]*tail.Tail)
	box := packr.New("doge", "./public")

	return &Doge{socketServer: socketServer, httpServer: httpServer, tailMap: tailMap, box: box, file: file, host: host, includes: includes, excludes: exclude, lines: lines}
}

func (doge *Doge) Run(user string, password string) {
	doge.socketServer.SetMaxConnection(50000)
	doge.socketServer.SetPingTimeout(10 * time.Second)
	doge.socketServer.SetPingInterval(time.Second)

	router := doge.httpServer.Group("/")
	router.Use(gin.Logger())
	router.Use(gin.BasicAuth(gin.Accounts{user: password}))
	router.GET("/*path", doge.handler)
	router.POST("/*path", doge.handler)
	router.Handle("WSS", "/", doge.handler)

	doge.socketServer.On("connection", func(socket socketio.Socket) {
		socket.Join("doge")
		fmt.Println(doge.includes, doge.excludes)
		socket.Emit("lines", doge.lines)
		socket.Emit("includes", doge.includes)
		socket.Emit("excludes", doge.excludes)
	})

	go doge.spinTail()

	doge.httpServer.Run(doge.host)
}

func (doge *Doge) handler(context *gin.Context) {
	path := context.Param("path")
	path = strings.TrimPrefix(path, "/")

	if strings.HasPrefix(path, "socket.io") || context.Request.Method == "WSS" {
		origin := context.Request.Header.Get("origin")
		context.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		context.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		doge.socketServer.ServeHTTP(context.Writer, context.Request)
	} else {
		if path == "" {
			path = "index.html"
		}

		data, err := doge.box.Find(path)
		if err == nil {
			context.Writer.Write(data)

			return
		}

		data, err = doge.box.Find("404.html")
		if err == nil {
			context.Writer.Write(data)

			return
		}

		context.Writer.WriteHeader(http.StatusNotFound)
	}
}

func (doge *Doge) spinTail() {
	t, _ := tail.TailFile(doge.file, tail.Config{Follow: true})
	for line := range t.Lines {
		doge.socketServer.BroadcastTo("doge", "line", line.Text)
	}
}

func main() {
	args := struct {
		User     string   `long:"user" short:"u" description:"server user" required:"true"`
		Pass     string   `long:"pass" short:"p" description:"server password" required:"true"`
		Server   string   `long:"server" short:"s" description:"server host" required:"true"`
		File     string   `long:"file" short:"f" description:"file to watch" required:"true"`
		Lines    int      `long:"lines" short:"l" description:"number of lines to filter" required:"false"`
		Includes []string `long:"includes" short:"i" description:"includes" required:"false"`
		Excludes []string `long:"excludes" short:"e" description:"excludes" required:"false"`
	}{}

	_, err := flags.Parse(&args)

	if err != nil {
		return
	}

	if args.Lines <= 0 {
		args.Lines = 100
	}

	if args.Includes == nil {
		args.Includes = []string{}
	}

	if args.Excludes == nil {
		args.Excludes = []string{}
	}

	doge := NewDoge(args.Server, args.File, args.Lines, args.Includes, args.Excludes)
	doge.Run(args.User, args.Pass)
}
