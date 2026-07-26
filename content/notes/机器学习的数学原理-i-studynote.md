---
title: "机器学习的数学原理（I） STUDYNOTE"
slug: "机器学习的数学原理-i-studynote"
date: "2025-08-31"
lastEditedTime: "2026-07-19T08:03:00.000Z"
renderVersion: "6"
category: "study"
tags: ["study","notes"]
status: "Published"
notionPageId: "3a2db726-82a8-80d3-adec-e0640e3554c0"
---

# 一、引入

对概率的诠释有两大学派，一种是频率派，另一种是贝叶斯派。后面我们对观测集采用下面记号：

$$X_{N\times p}=(x_{1},x_{2},\cdots,x_{N})^{T},\quad x_i=(x_{i1},x_{i2},\cdots,x_{ip})^T$$

这个记号表示有 N 个样本，每个样本都是 p 维向量。其中每个观测都是由下面的分布生成的：

$$p(x|\theta)$$

## 频率派的观点

频率派认为下面分布中的参数 theta 是一个常量：

$$p(x|\theta)$$

对于 N 个观测来说，观测集的概率为：

$$p(X|\theta)\mathop{=}\limits_{iid}\prod\limits_{i=1}^{N}p(x_i|\theta)$$

为了求 theta 的大小，我们采用最大对数似然 MLE 的方法：

$$\theta_{MLE}=\mathop{argmax}\limits_{\theta}\log p(X|\theta)\mathop{=}\limits_{iid}\mathop{argmax}\limits_{\theta}\sum\limits_{i=1}^{N}\log p(x_i|\theta)$$

## 贝叶斯派的观点

贝叶斯派认为 \(p(x|\theta)\) 中的 theta 不是一个常量。这个 theta 满足一个预设的先验分布：

$$\theta\sim p(\theta)$$

于是根据贝叶斯定理，依赖观测集参数的后验可以写成：

$$p(\theta|X)=\frac{p(X|\theta)\cdot p(\theta)}{p(X)}=\frac{p(X|\theta)\cdot p(\theta)}{\int\limits_{\theta}p(X|\theta)\cdot p(\theta)d\theta}$$

为了求 theta 的值，我们要最大化这个参数后验 MAP：

$$\theta_{MAP}=\mathop{argmax}\limits_{\theta}p(\theta|X)=\mathop{argmax}\limits_{\theta}p(X|\theta)\cdot p(\theta)$$

其中第二个等号是由于分母和 theta 没有关系。求解这个 theta 值后计算

$$\frac{p(X|\theta)\cdot p(\theta)}{\int\limits_{\theta}p(X|\theta)\cdot p(\theta)d\theta}$$

就得到了参数的后验概率。其中 p\(X\|theta\) 叫似然，是我们的模型分布。得到了参数的后验分布后，我们可以将这个分布用于贝叶斯预测：

$$p(x_{new}|X)=\int\limits_{\theta}p(x_{new}|\theta)\cdot p(\theta|X)d\theta$$

其中积分中的被乘数是模型，乘数是后验分布。

## 小结

频率派和贝叶斯派分别给出了一系列的机器学习算法。频率派的观点导出了一系列的统计机器学习算法，而贝叶斯派导出了概率图理论。在应用频率派的 MLE 方法时，最优化理论占有重要地位。而贝叶斯派的算法无论是后验概率的建模还是应用这个后验进行推断时，积分都占有重要地位。因此采样积分方法如 MCMC 有很多应用。

## MathBasics

### 高斯分布

1\. 一维情况 MLE

高斯分布在机器学习中占有举足轻重的作用。在 MLE 方法中：

$$\theta=(\mu,\Sigma)=(\mu,\sigma^2),\quad \theta_{MLE}=\mathop{argmax}\limits_{\theta}\log p(X|\theta)\mathop{=}\limits_{iid}\mathop{argmax}\limits_{\theta}\sum\limits_{i=1}^{N}\log p(x_i|\theta)$$

一般地，高斯分布的概率密度函数 PDF 写为：

$$p(x|\mu,\Sigma)=\frac{1}{(2\pi)^{p/2}|\Sigma|^{1/2}}e^{-\frac{1}{2}(x-\mu)^T\Sigma^{-1}(x-\mu)}$$

代入 MLE 中，我们考虑一维的情况：

$$\log p(X|\theta)=\sum\limits_{i=1}^{N}\log p(x_i|\theta)=\sum\limits_{i=1}^{N}\log\frac{1}{\sqrt{2\pi}\sigma}\exp\left(-\frac{(x_i-\mu)^2}{2\sigma^2}\right)$$

首先对 \(\mu\) 的极值可以得到：

$$\mu_{MLE}=\mathop{argmax}\limits_{\mu}\log p(X|\theta)=\mathop{argmin}\limits_{\mu}\sum\limits_{i=1}^{N}(x_i-\mu)^2$$

于是：

$$\frac{\partial}{\partial\mu}\sum\limits_{i=1}^{N}(x_i-\mu)^2=0\longrightarrow\mu_{MLE}=\frac{1}{N}\sum\limits_{i=1}^{N}x_i$$

其次对 \(\theta\) 中的另一个参数 \(\sigma\)，有：

$$\begin{aligned}
\sigma_{MLE}&=\mathop{argmax}\limits_{\sigma}\log p(X|\theta)\\
&=\mathop{argmax}\limits_{\sigma}\sum\limits_{i=1}^{N}\left[-\log\sigma-\frac{1}{2\sigma^2}(x_i-\mu)^2\right]\\
&=\mathop{argmin}\limits_{\sigma}\sum\limits_{i=1}^{N}\left[\log\sigma+\frac{1}{2\sigma^2}(x_i-\mu)^2\right]
\end{aligned}$$

于是：

$$\frac{\partial}{\partial\sigma}\sum\limits_{i=1}^{N}\left[\log\sigma+\frac{1}{2\sigma^2}(x_i-\mu)^2\right]=0\longrightarrow\sigma_{MLE}^2=\frac{1}{N}\sum\limits_{i=1}^{N}(x_i-\mu)^2$$

值得注意的是，上面的推导中，首先对 mu 求 MLE，然后利用这个结果求 \(\sigma_{MLE}\)，因此可以预期的是，对数据集求期望时 \(\sigma_{MLE}\) 是无偏的：

$$\mathbb{E}_{\mathcal{D}}[\mu_{MLE}]=\mathbb{E}_{\mathcal{D}}\left[\frac{1}{N}\sum\limits_{i=1}^{N}x_i\right]=\frac{1}{N}\sum\limits_{i=1}^{N}\mathbb{E}_{\mathcal{D}}[x_i]=\mu$$

但是当对 \(\sigma_{MLE}\) 求期望的时候，由于使用了单个数据集的 \(\sigma_{MLE}\)，因此对所有数据集求期望的时候我们会发现 \(\sigma_{MLE}\) 是有偏的：

$$\begin{aligned}
\mathbb{E}_{\mathcal{D}}[\sigma_{MLE}^2]
&=\mathbb{E}_{\mathcal{D}}\left[\frac{1}{N}\sum\limits_{i=1}^{N}(x_i-\mu_{MLE})^2\right]\\
&=\mathbb{E}_{\mathcal{D}}\left[\frac{1}{N}\sum\limits_{i=1}^{N}x_i^2-\mu_{MLE}^2\right]\\
&=\mathbb{E}_{\mathcal{D}}\left[\frac{1}{N}\sum\limits_{i=1}^{N}x_i^2-\mu^2\right]-\mathbb{E}_{\mathcal{D}}[\mu_{MLE}^2-\mu^2]\\
&=\sigma^2-\left(\mathbb{E}_{\mathcal{D}}[\mu_{MLE}^2]-\mathbb{E}_{\mathcal{D}}^2[\mu_{MLE}]\right)\\
&=\sigma^2-Var[\mu_{MLE}]\\
&=\sigma^2-Var\left[\frac{1}{N}\sum\limits_{i=1}^{N}x_i\right]\\
&=\sigma^2-\frac{1}{N^2}\sum\limits_{i=1}^{N}Var[x_i]=\frac{N-1}{N}\sigma^2
\end{aligned}$$

所以：

$$\hat{\sigma}^2=\frac{1}{N-1}\sum\limits_{i=1}^{N}(x_i-\mu)^2$$

### 多维情况

多维高斯分布表达式为：

$$p(x|\mu,\Sigma)=\frac{1}{(2\pi)^{p/2}|\Sigma|^{1/2}}e^{-\frac{1}{2}(x-\mu)^T\Sigma^{-1}(x-\mu)}$$

其中：

$$x,\mu\in\mathbb{R}^p,\quad \Sigma\in\mathbb{R}^{p\times p}$$

\(\Sigma\)为协方差矩阵，一般而言也是半正定矩阵。这里我们只考虑正定矩阵。首先我们处理指数上的数字，指数上的数字可以记为 \(x\) 和 \(\mu\) 之间的马氏距离。对于对称的协方差矩阵可进行特征值分解：

$$\Sigma=U\Lambda U^T=(u_1,u_2,\cdots,u_p)diag(\lambda_i)(u_1,u_2,\cdots,u_p)^T=\sum\limits_{i=1}^{p}u_i\lambda_i u_i^T$$

于是：

$$\Sigma^{-1}=\sum\limits_{i=1}^{p}u_i\frac{1}{\lambda_i}u_i^T$$

$$\Delta=(x-\mu)^T\Sigma^{-1}(x-\mu)=\sum\limits_{i=1}^{p}(x-\mu)^Tu_i\frac{1}{\lambda_i}u_i^T(x-\mu)=\sum\limits_{i=1}^{p}\frac{y_i^2}{\lambda_i}$$

我们注意到 y\_i 是 x\-mu 在特征向量 u\_i 上的投影长度，因此上式子就是 Delta 取不同值时的同心椭圆。

下面我们看多维高斯模型在实际应用时的两个问题：

1. 参数 Sigma 和 mu 的自由度为：
$$O(p^2)$$

高自由度的来源是 Sigma 有如下自由参数个数：

$$\frac{p(p+1)}{2}$$

可以假设其是对角矩阵，甚至在各向同性假设中假设其对角线上的元素都相同。前一种的算法有 Factor Analysis，后一种有概率 PCA（p\-PCA）。

1. 第二个问题是单个高斯分布是单峰的，对有多个峰的数据分布不能得到好的结果。解决方案：高斯混合 GMM 模型。
下面对多维高斯分布的常用定理进行介绍。

我们记：

$$x=(x_1,x_2,\cdots,x_p)^T=(x_{a,m\times1},x_{b,n\times1})^T$$

$$\mu=(\mu_{a,m\times1},\mu_{b,n\times1})$$

$$\Sigma=\begin{pmatrix}\Sigma_{aa}&\Sigma_{ab}\\\Sigma_{ba}&\Sigma_{bb}\end{pmatrix}$$

已知：

$$x\sim\mathcal{N}(\mu,\Sigma)$$

首先是一个高斯分布的定理。

定理：已知

$$x\sim\mathcal{N}(\mu,\Sigma),\quad y=Ax+b$$

那么：

$$y\sim\mathcal{N}(A\mu+b,A\Sigma A^T)$$

证明：

$$\mathbb{E}[y]=\mathbb{E}[Ax+b]=A\mathbb{E}[x]+b=A\mu+b$$

$$Var[y]=Var[Ax+b]=Var[Ax]=A\cdot Var[x]\cdot A^T$$

下面利用这个定理得到下面四个量：

$$p(x_a),\quad p(x_b),\quad p(x_a|x_b),\quad p(x_b|x_a)$$

1. 对 x\_a，有：
$$x_a=\begin{pmatrix}\mathbb{I}_{m\times m}&\mathbb{O}_{m\times n}\end{pmatrix}\begin{pmatrix}x_a\\x_b\end{pmatrix}$$

代入定理中得到：

$$\mathbb{E}[x_a]=\begin{pmatrix}\mathbb{I}&\mathbb{O}\end{pmatrix}\begin{pmatrix}\mu_a\\\mu_b\end{pmatrix}=\mu_a$$

$$Var[x_a]=\begin{pmatrix}\mathbb{I}&\mathbb{O}\end{pmatrix}\begin{pmatrix}\Sigma_{aa}&\Sigma_{ab}\\\Sigma_{ba}&\Sigma_{bb}\end{pmatrix}\begin{pmatrix}\mathbb{I}\\\mathbb{O}\end{pmatrix}=\Sigma_{aa}$$

所以：

$$x_a\sim\mathcal{N}(\mu_a,\Sigma_{aa})$$

1. 同样地：
$$x_b\sim\mathcal{N}(\mu_b,\Sigma_{bb})$$

1. 对于两个条件概率，我们引入三个量：
$$x_{b\cdot a}=x_b-\Sigma_{ba}\Sigma_{aa}^{-1}x_a$$

$$\mu_{b\cdot a}=\mu_b-\Sigma_{ba}\Sigma_{aa}^{-1}\mu_a$$

$$\Sigma_{bb\cdot a}=\Sigma_{bb}-\Sigma_{ba}\Sigma_{aa}^{-1}\Sigma_{ab}$$

特别地，最后一个式子叫做 \(\Sigma_{bb}\) 的 Schur Complementary。可以看到：

$$x_{b\cdot a}=\begin{pmatrix}-\Sigma_{ba}\Sigma_{aa}^{-1}&\mathbb{I}_{n\times n}\end{pmatrix}\begin{pmatrix}x_a\\x_b\end{pmatrix}$$

所以：

$$\mathbb{E}[x_{b\cdot a}]=\begin{pmatrix}-\Sigma_{ba}\Sigma_{aa}^{-1}&\mathbb{I}_{n\times n}\end{pmatrix}\begin{pmatrix}\mu_a\\\mu_b\end{pmatrix}=\mu_{b\cdot a}$$

$$Var[x_{b\cdot a}]=\begin{pmatrix}-\Sigma_{ba}\Sigma_{aa}^{-1}&\mathbb{I}_{n\times n}\end{pmatrix}\begin{pmatrix}\Sigma_{aa}&\Sigma_{ab}\\\Sigma_{ba}&\Sigma_{bb}\end{pmatrix}\begin{pmatrix}-\Sigma_{aa}^{-1}\Sigma_{ba}^T\\\mathbb{I}_{n\times n}\end{pmatrix}=\Sigma_{bb\cdot a}$$

利用这三个量可以得到：

$$x_b=x_{b\cdot a}+\Sigma_{ba}\Sigma_{aa}^{-1}x_a$$

因此：

$$\mathbb{E}[x_b|x_a]=\mu_{b\cdot a}+\Sigma_{ba}\Sigma_{aa}^{-1}x_a$$

$$Var[x_b|x_a]=\Sigma_{bb\cdot a}$$

1. 同样地：
$$x_{a\cdot b}=x_a-\Sigma_{ab}\Sigma_{bb}^{-1}x_b$$

$$\mu_{a\cdot b}=\mu_a-\Sigma_{ab}\Sigma_{bb}^{-1}\mu_b$$

$$\Sigma_{aa\cdot b}=\Sigma_{aa}-\Sigma_{ab}\Sigma_{bb}^{-1}\Sigma_{ba}$$

所以：

$$\mathbb{E}[x_a|x_b]=\mu_{a\cdot b}+\Sigma_{ab}\Sigma_{bb}^{-1}x_b$$

$$Var[x_a|x_b]=\Sigma_{aa\cdot b}$$

下面利用上边四个量，求解线性模型。

已知：

$$p(x)=\mathcal{N}(\mu,\Lambda^{-1}),\quad p(y|x)=\mathcal{N}(Ax+b,L^{-1})$$

求解：

$$p(y),\quad p(x|y)$$

解：令

$$y=Ax+b+\epsilon,\quad \epsilon\sim\mathcal{N}(0,L^{-1})$$

所以：

$$\mathbb{E}[y]=\mathbb{E}[Ax+b+\epsilon]=A\mu+b$$

$$Var[y]=A\Lambda^{-1}A^T+L^{-1}$$

因此：

$$p(y)=\mathcal{N}(A\mu+b,L^{-1}+A\Lambda^{-1}A^T)$$

引入：

$$z=\begin{pmatrix}x\\y\end{pmatrix}$$

我们可以得到：

$$Cov[x,y]=\mathbb{E}[(x-\mathbb{E}[x])(y-\mathbb{E}[y])^T]$$

对于这个协方差可以直接计算：

$$\begin{aligned}
Cov(x,y)&=\mathbb{E}[(x-\mu)(Ax-A\mu+\epsilon)^T]\\
&=\mathbb{E}[(x-\mu)(x-\mu)^TA^T]=Var[x]A^T=\Lambda^{-1}A^T
\end{aligned}$$

注意到协方差矩阵的对称性，所以：

$$p(z)=\mathcal{N}\left(\begin{pmatrix}\mu\\A\mu+b\end{pmatrix},\begin{pmatrix}\Lambda^{-1}&\Lambda^{-1}A^T\\A\Lambda^{-1}&L^{-1}+A\Lambda^{-1}A^T\end{pmatrix}\right)$$

根据之前的公式，我们可以得到：

$$\mathbb{E}[x|y]=\mu+\Lambda^{-1}A^T(L^{-1}+A\Lambda^{-1}A^T)^{-1}(y-A\mu-b)$$

$$Var[x|y]=\Lambda^{-1}-\Lambda^{-1}A^T(L^{-1}+A\Lambda^{-1}A^T)^{-1}A\Lambda^{-1}$$

# 二、线性回归

假设数据集为：

$$\mathcal{D}=\{(x_1,y_1),(x_2,y_2),\cdots,(x_N,y_N)\}$$

后面我们记：

$$X=(x_1,x_2,\cdots,x_N)^T,\quad Y=(y_1,y_2,\cdots,y_N)^T$$

线性回归假设：

$$f(w)=w^Tx$$

## 最小二乘法

对这个问题，采用二范数定义的平方误差来定义损失函数：

$$L(w)=\sum\limits_{i=1}^N\|w^Tx_i-y_i\|_2^2$$

展开得到：

$$\begin{aligned}
L(w)&=(w^Tx_1-y_1,\cdots,w^Tx_N-y_N)\cdot(w^Tx_1-y_1,\cdots,w^Tx_N-y_N)^T\\
&=(w^TX^T-Y^T)\cdot(Xw-Y)\\
&=w^TX^TXw-Y^TXw-w^TX^TY+Y^TY\\
&=w^TX^TXw-2w^TX^TY+Y^TY
\end{aligned}$$

最小化这个值的 \(\hat {w}\)：

$$\begin{aligned}
\hat{w}=\arg\min\limits_wL(w)
&\Longrightarrow \frac{\partial}{\partial w}L(w)=0\\
&\Longrightarrow 2X^TX\hat{w}-2X^TY=0\\
&\Longrightarrow \hat{w}=(X^TX)^{-1}X^TY=X^+Y
\end{aligned}$$

这个式子中， \((X^TX)^{-1}X^T\) 又被称为伪逆。对于行满秩或者列满秩的 \(X\)，可以直接求解；但是对于非满秩的样本集合，需要使用奇异值分解（SVD）的方法。对 \(X\) 求奇异值分解，得到：

$$X=U\Sigma V^T$$

于是：

$$X^+=V\Sigma^{-1}U^T$$

在几何上，最小二乘法相当于模型（这里就是直线）和试验值的距离的平方求和。假设我们的试验样本张成一个 \(p\) 维空间（满秩的情况）： \(X=mathrm{Span}(x_1,cdots,x_N)\)，而模型可以写成  \(f(w)=X\beta\)，也就是 \(x_1,\cdots,x_N\) 的某种组合，而最小二乘法就是说希望 \(Y\) 和这个模型距离越小越好，于是它们的差应该与这个张成的空间垂直：

$$X^T(Y-X\beta)=0\Longrightarrow \beta=(X^TX)^{-1}X^TY$$

## 噪声为高斯分布的 MLE

对于一维的情况，记  \(y=w^Tx+\epsilon, \epsilon\sim\mathcal{N}(0,\sigma^2)\)，那么 \(y\sim\mathcal{N}(w^Tx,\sigma^2)\)。代入极大似然估计中：

$$\begin{aligned}
L(w)=\log p(Y|X,w)
&=\log\prod\limits_{i=1}^Np(y_i|x_i,w)\\
&=\sum\limits_{i=1}^N\log\left(\frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{(y_i-w^Tx_i)^2}{2\sigma^2}}\right)\\
\arg\max\limits_wL(w)&=\arg\min\limits_w\sum\limits_{i=1}^N(y_i-w^Tx_i)^2
\end{aligned}$$

这个表达式和最小二乘估计得到的结果一样。

## 权重先验也为高斯分布的 MAP

取先验分布 \(w\sim\mathcal{N}(0,\sigma_0^2)\)。于是：

$$\begin{aligned}
\hat{w}=\arg\max\limits_wp(w|Y)
&=\arg\max\limits_wp(Y|w)p(w)\\
&=\arg\max\limits_w\big(\log p(Y|w)+\log p(w)\big)\\
&=\arg\min\limits_w\left[(y-w^Tx)^2+\frac{\sigma^2}{\sigma_0^2}w^Tw\right]
\end{aligned}$$

这里省略了 \(X\)， \(p(Y)\) 和 \(w\) 没有关系，同时也利用了上面高斯分布的 MLE 的结果。

我们将会看到，超参数 \(\sigma_0\) 的存在和下面会介绍的 Ridge 正则项可以对应。同样地，如果将先验分布取为 Laplace 分布，那么就会得到和 L1 正则类似的结果。

## 正则化

在实际应用时，如果样本容量不远远大于样本的特征维度，很可能造成过拟合。对这种情况，我们有下面三个解决方式：

1. 加数据
1. 特征选择（降低特征维度）如 PCA 算法
1. 正则化
正则化一般是在损失函数（如上面介绍的最小二乘损失）上加入正则化项（表示模型的复杂度对模型的惩罚），下面我们介绍一般情况下的两种正则化框架：

$$\begin{aligned}
L1:&\ \arg\min\limits_wL(w)+\lambda\|w\|_1,\quad \lambda>0\\
L2:&\ \arg\min\limits_wL(w)+\lambda\|w\|_2^2,\quad \lambda>0
\end{aligned}$$

下面对最小二乘误差分别分析这两者的区别。

### L1 Lasso

L1 正则化可以引起稀疏解。

从最小化损失的角度看，由于 L1 项求导在 0 附近的左右导数都不是 0，因此更容易取到 0 解。

从另一个方面看，L1 正则化相当于：

$$\arg\min\limits_wL(w)$$

满足约束：

$$\|w\|_1<C$$

我们已经看到平方误差损失函数在 \(w\) 空间是一个椭球，因此上式求解就是椭球和 \(\|w\|_1=C\) 的切点，因此更容易相切在坐标轴上。

### L2 Ridge

$$\begin{aligned}
\hat{w}=\arg\min\limits_wL(w)+\lambda w^Tw
&\Longrightarrow \frac{\partial}{\partial w}L(w)+2\lambda w=0\\
&\Longrightarrow 2X^TX\hat{w}-2X^TY+2\lambda\hat{w}=0\\
&\Longrightarrow \hat{w}=(X^TX+\lambda I)^{-1}X^TY
\end{aligned}$$

可以看到，这个正则化参数和前面的 MAP 结果不谋而合。利用 2 范数进行正则化不仅可以使模型选择较小的参数，同时也避免 \(X^TX\) 不可逆的问题。

## 小结

线性回归模型是最简单的模型，但是麻雀虽小，五脏俱全。在这里，我们利用最小二乘误差得到了闭式解。同时也发现，在噪声为高斯分布的时候，MLE 的解等价于最小二乘误差，而增加了正则项后，最小二乘误差加上 L2 正则项等价于高斯噪声先验下的 MAP 解，加上 L1 正则项后，等价于 Laplace 噪声先验。

传统的机器学习方法或多或少都有线性回归模型的影子：

1. 线性模型往往不能很好地拟合数据，因此有三种方案克服这一劣势：
1. 对特征的维数进行变换，例如多项式回归模型就是在线性特征的基础上加入高次项。
  1. 在线性方程后面加入一个非线性变换，即引入一个非线性的激活函数，典型的有线性分类模型如感知机。
  1. 对于一致的线性系数，我们进行多次变换，这样同一个特征不仅仅被单个系数影响，例如多层感知机（深度前馈网络）。
1. 线性回归在整个样本空间都是线性的，我们修改这个限制，在不同区域引入不同的线性或非线性，例如线性样条回归和决策树模型。
1. 线性回归中使用了所有的样本，但是对数据预先进行加工学习的效果可能更好（所谓的维数灾难，高维度数据更难学习），例如 PCA 算法和流形学习。
# 三、线性分类

对于分类任务，线性回归模型就无能为力了，但是我们可以在线性模型的函数后再加入一层激活函数，这个函数是非线性的，激活函数的反函数叫做链接函数。我们有两种线性分类的方式：

1. 硬分类，我们直接需要输出观测对应的分类。这类模型的代表为：
1. 线性判别分析（Fisher 判别）
  1. 感知机
1. 软分类，产生不同类别的概率，这类算法根据概率方法的不同分为两种：
1. 生成式（根据贝叶斯定理先计算参数后验，再进行推断）：高斯判别分析（GDA）和朴素贝叶斯等为代表
1. GDA
    1. Naive Bayes
  1. 判别式（直接对条件概率进行建模）：Logistic 回归
## 两分类\-硬分类\-感知机算法

我们选取激活函数为：

$$sign(a)=\left\{\begin{matrix}+1,&a\ge 0\\-1,&a<0\end{matrix}\right.$$

这样就可以将线性回归的结果映射到两分类的结果上了。

定义损失函数为错误分类的数目，比较直观的方式是使用指示函数，但是指示函数不可导，因此可以定义：

$$L(w)=\sum\limits_{x_i\in\mathcal{D}_{wrong}}-y_iw^Tx_i$$

其中， \(\mathcal{D}_{wrong}\)是错误分类集合，实际在每一次训练的时候，我们采用梯度下降的算法。损失函数对 \(w\) 的偏导为：

$$\frac{\partial}{\partial w}L(w)=\sum\limits_{x_i\in\mathcal{D}_{wrong}}-y_ix_i$$

但是如果样本非常多的情况下，计算复杂度较高。但是，实际上我们并不需要绝对的损失函数下降方向，我们只需要损失函数的期望值下降；但是计算期望需要知道真实的概率分布，我们实际只能根据训练数据抽样来估算这个概率分布（经验风险）：

$$\mathbb{E}_{\mathcal D}\left[\mathbb{E}_{\hat p}[\nabla_wL(w)]\right]=\mathbb{E}_{\mathcal D}\left[\frac{1}{N}\sum\limits_{i=1}^N\nabla_wL(w)\right]$$

我们知道， \(N\) 越大，样本近似真实分布越准确；但是对于一个标准差为 \(\sigma\) 的数据，可以确定的标准差仅和 \(\sqrt{N}\) 成反比，而计算速度却和 \(N\) 成正比。因此可以每次使用较少样本，则在数学期望的意义上损失降低的同时，又可以提高计算速度。如果每次只使用一个错误样本，我们有下面的更新策略（根据泰勒公式，在负方向）：

$$w^{t+1}\leftarrow w^t+\lambda y_ix_i$$

是可以收敛的。同时使用单个观测更新也可以在一定程度上增加不确定度，从而减轻陷入局部最小的可能。在更大规模的数据上，常用的是小批量随机梯度下降法。

## 两分类\-硬分类\-线性判别分析 LDA

在 LDA 中，我们的基本想法是选定一个方向，将试验样本顺着这个方向投影，投影后的数据需要满足两个条件，从而可以更好地分类：

1. 相同类内部的试验样本距离接近。
1. 不同类别之间的距离较大。
首先是投影，我们假定原来的数据是向量 \(x\)，那么顺着 \(w\) 方向的投影就是标量：

$$z=w^T\cdot x(=\|w\|\cdot\|x\|\cos\theta)$$

对第一点，相同类内部的样本更为接近，我们假设属于两类的试验样本数量分别是 \(N_1\) 和 \(N_2\)。那么我们采用方差矩阵来表征每一个类内的总体分布，这里我们使用了协方差的定义，用 \(S\) 表示原数据的协方差：

$$\begin{aligned}
C_1:Var_z[C_1]&=\frac{1}{N_1}\sum\limits_{i=1}^{N_1}(z_i-\overline{z_{c1}})(z_i-\overline{z_{c1}})^T\\
&=\frac{1}{N_1}\sum\limits_{i=1}^{N_1}\left(w^Tx_i-\frac{1}{N_1}\sum\limits_{j=1}^{N_1}w^Tx_j\right)\left(w^Tx_i-\frac{1}{N_1}\sum\limits_{j=1}^{N_1}w^Tx_j\right)^T\\
&=w^T\frac{1}{N_1}\sum\limits_{i=1}^{N_1}(x_i-\overline{x_{c1}})(x_i-\overline{x_{c1}})^Tw\\
&=w^TS_1w\\
C_2:Var_z[C_2]&=\frac{1}{N_2}\sum\limits_{i=1}^{N_2}(z_i-\overline{z_{c2}})(z_i-\overline{z_{c2}})^T\\
&=w^TS_2w
\end{aligned}$$

所以类内距离可以记为：

$$Var_z[C_1]+Var_z[C_2]=w^T(S_1+S_2)w$$

对于第二点，我们可以用两类的均值表示这个距离：

$$\begin{aligned}
(\overline{z_{c1}}-\overline{z_{c2}})^2
&=\left(\frac{1}{N_1}\sum\limits_{i=1}^{N_1}w^Tx_i-\frac{1}{N_2}\sum\limits_{i=1}^{N_2}w^Tx_i\right)^2\\
&=\left(w^T(\overline{x_{c1}}-\overline{x_{c2}})\right)^2\\
&=w^T(\overline{x_{c1}}-\overline{x_{c2}})(\overline{x_{c1}}-\overline{x_{c2}})^Tw
\end{aligned}$$

综合这两点，由于协方差是一个矩阵，于是我们用将这两个值相除来得到我们的损失函数，并最大化这个值：

$$\begin{aligned}
\hat{w}=\arg\max\limits_wJ(w)
&=\arg\max\limits_w\frac{(\overline{z_{c1}}-\overline{z_{c2}})^2}{Var_z[C_1]+Var_z[C_2]}\\
&=\arg\max\limits_w\frac{w^T(\overline{x_{c1}}-\overline{x_{c2}})(\overline{x_{c1}}-\overline{x_{c2}})^Tw}{w^T(S_1+S_2)w}\\
&=\arg\max\limits_w\frac{w^TS_bw}{w^TS_ww}
\end{aligned}$$

这样，我们就把损失函数和原数据集以及参数结合起来了。下面对这个损失函数求偏导，注意我们其实对 \(w\) 的绝对值没有任何要求，只对方向有要求，因此只要一个方程就可以求解了：

$$\begin{aligned}
&\frac{\partial}{\partial w}J(w)=2S_bw(w^TS_ww)^{-1}-2w^TS_bw(w^TS_ww)^{-2}S_ww=0\\
&\Longrightarrow S_bw(w^TS_ww)=(w^TS_bw)S_ww\\
&\Longrightarrow w\propto S_w^{-1}S_bw\propto S_w^{-1}(\overline{x_{c1}}-\overline{x_{c2}})
\end{aligned}$$

于是 \(S_w^{-1}(\overline{x_{c1}}-\overline{x_{c2}})\) 就是我们需要寻找的方向。最后可以归一化求得单位的 \(w\) 值。

## 两分类\-软分类\-概率判别模型\-Logistic 回归

有时候我们只要得到一个类别的概率，那么我们需要一种能输出 \([0,1]\) 区间的值的函数。考虑两分类模型，我们利用判别模型，希望对 \(p(C|x)\) 建模，利用贝叶斯定理：

$$p(C_1|x)=\frac{p(x|C_1)p(C_1)}{p(x|C_1)p(C_1)+p(x|C_2)p(C_2)}$$

取 \(a=lnfrac{p(x|C_1)p(C_1)}{p(x|C_2)p(C_2)}\)，于是：

$$p(C_1|x)=\frac{1}{1+\exp(-a)}$$

上面的式子叫 Logistic Sigmoid 函数，其参数表示了两类联合概率比值的对数。在判别式中，不关心这个参数的具体值，模型假设直接对 \(a\) 进行建模。

Logistic 回归的模型假设是：

$$a=w^Tx$$

于是，通过寻找 \(w\) 的最佳值可以得到在这个模型假设下的最佳模型。概率判别模型常用最大似然估计的方式来确定参数。

对于一次观测，获得分类 \(y\) 的概率为（假定 \(C_1=1,C_2=0\)）：

$$p(y|x)=p_1^yp_0^{1-y}$$

那么对于 \(N\) 次独立全同的观测，MLE 为：

$$\hat{w}=\arg\max_wJ(w)=\arg\max_w\sum\limits_{i=1}^N(y_i\log p_1+(1-y_i)\log p_0)$$

注意到，这个表达式是交叉熵表达式的相反数乘 \(N\)，MLE 中的对数也保证了可以和指数函数相匹配，从而在大的区间中获取稳定的梯度。

对这个函数求导数，注意到：

$$p_1'=\left(\frac{1}{1+\exp(-a)}\right)'=p_1(1-p_1)$$

则：

$$J'(w)=\sum\limits_{i=1}^Ny_i(1-p_1)x_i-p_1x_i+y_ip_1x_i=\sum\limits_{i=1}^N(y_i-p_1)x_i$$

由于概率值的非线性，放在求和符号中时，这个式子无法直接求解。于是在实际训练的时候，和感知机类似，也可以使用不同大小的批量随机梯度上升（对于最小化就是梯度下降）来获得这个函数的极大值。

## 两分类\-软分类\-概率生成模型\-高斯判别分析 GDA

生成模型中，我们对联合概率分布进行建模，然后采用 MAP 来获得参数的最佳值。两分类的情况，我们采用的假设：

1. \(y\sim Bernoulli(\phi)\)
1. \(x|y=1\sim\mathcal{N}(\mu_1,\Sigma)\)
1. \(x|y=0\sim\mathcal{N}(\mu_0,\Sigma)\)
那么独立全同的数据集最大后验概率可以表示为：

$$\begin{aligned}
\arg\max_{\phi,\mu_0,\mu_1,\Sigma}\log p(X|Y)p(Y)
&=\arg\max_{\phi,\mu_0,\mu_1,\Sigma}\sum\limits_{i=1}^N(\log p(x_i|y_i)+\log p(y_i))\\
&=\arg\max_{\phi,\mu_0,\mu_1,\Sigma}\sum\limits_{i=1}^N\Big((1-y_i)\log\mathcal{N}(\mu_0,\Sigma)+y_i\log\mathcal{N}(\mu_1,\Sigma)\\
&\qquad\qquad\qquad\qquad +y_i\log\phi+(1-y_i)\log(1-\phi)\Big)
\end{aligned}$$

首先对 \(\phi\) 进行求解，将式子对 \(\phi\) 求偏导：

$$\sum\limits_{i=1}^N\frac{y_i}{\phi}+\frac{y_i-1}{1-\phi}=0\Longrightarrow \phi=\frac{\sum\limits_{i=1}^Ny_i}{N}=\frac{N_1}{N}$$

然后求解 \(\mu_1\)：

$$\begin{aligned}
\hat{\mu}_1
&=\arg\max_{\mu_1}\sum\limits_{i=1}^Ny_i\log\mathcal{N}(\mu_1,\Sigma)\\
&=\arg\min_{\mu_1}\sum\limits_{i=1}^Ny_i(x_i-\mu_1)^T\Sigma^{-1}(x_i-\mu_1)
\end{aligned}$$

由于：

$$\sum\limits_{i=1}^Ny_i(x_i-\mu_1)^T\Sigma^{-1}(x_i-\mu_1)=\sum\limits_{i=1}^Ny_ix_i^T\Sigma^{-1}x_i-2y_i\mu_1^T\Sigma^{-1}x_i+y_i\mu_1^T\Sigma^{-1}\mu_1$$

求微分左边乘以 \(\Sigma\) 可以得到：

$$\sum\limits_{i=1}^N-2y_i\Sigma^{-1}x_i+2y_i\Sigma^{-1}\mu_1=0\Longrightarrow \mu_1=\frac{\sum\limits_{i=1}^Ny_ix_i}{N_1}$$

同理：

$$\mu_0=\frac{\sum\limits_{i=1}^N(1-y_i)x_i}{N_0}$$

最为困难的是求解 $Sigma$。我们的模型假设对正反例采用相同的协方差矩阵。首先我们有：

$$\begin{aligned}
\sum\limits_{i=1}^N\log\mathcal{N}(\mu,\Sigma)
&=Const-\frac{1}{2}N\log|\Sigma|-\frac{1}{2}\operatorname{Trace}((x_i-\mu)^T\Sigma^{-1}(x_i-\mu))\\
&=Const-\frac{1}{2}N\log|\Sigma|-\frac{1}{2}\operatorname{Trace}((x_i-\mu)(x_i-\mu)^T\Sigma^{-1})\\
&=Const-\frac{1}{2}N\log|\Sigma|-\frac{1}{2}N\operatorname{Trace}(S\Sigma^{-1})
\end{aligned}$$

在这个表达式中，我们在标量上加入迹从而可以交换矩阵的顺序。对于包含绝对值和迹的表达式的导数，我们有：

$$\frac{\partial}{\partial A}|A|=|A|A^{-1},\qquad \frac{\partial}{\partial A}\operatorname{Trace}(AB)=B^T$$

于是：

$$N\Sigma^{-1}-N_1S_1^T\Sigma^{-2}-N_2S_2^T\Sigma^{-2}=0\Longrightarrow \Sigma=\frac{N_1S_1+N_2S_2}{N}$$

这里应用了类协方差矩阵的对称性。

于是我们就利用最大后验的方法求得了我们模型假设里面的所有参数。根据模型，可以得到联合分布，也就可以得到用于推断的条件分布了。

## 两分类\-软分类\-概率生成模型\-朴素贝叶斯

上面的高斯判别分析是对数据集的分布作出了高斯分布的假设，同时引入伯努利分布作为类先验，从而利用最大后验求得这些假设中的参数。

朴素贝叶斯对数据的属性之间的关系作出了假设。一般地，我们需要得到 \(p(x|y)\) 这个概率值。由于 \(x\) 有 \(p\) 个维度，因此需要对这么多维度的联合概率进行采样。但是我们知道这么高维度的空间中采样，需要的样本数量非常大才能获得较为准确的概率近似。

在一般的有向概率图模型中，对各个属性维度之间的条件独立关系作出了不同的假设。其中最为简单的一个假设就是在朴素贝叶斯模型描述中的条件独立性假设：

$$p(x|y)=\prod\limits_{i=1}^pp(x_i|y)$$

即：

$$x_i\perp x_j|y,\quad \forall i\ne j$$

于是利用贝叶斯定理，对于单次观测：

$$p(y|x)=\frac{p(x|y)p(y)}{p(x)}=\frac{\prod\limits_{i=1}^pp(x_i|y)p(y)}{p(x)}$$

对于单个维度的条件概率以及类先验作出进一步的假设：

1. \(x_i\) 为连续变量： \(p(x_i|y)=mathcal{N}(\mu_i,\sigma_i^2)\)
1. \(x_i\) 为离散变量：类别分布（Categorical）： \(p(x_i=i|y)=\theta_i, \sum\limits_{i=1}^K \theta_i=1\)
1. \(p(y)=\phi^y(1-\phi)^{1-y}\)
对这些参数的估计，常用 MLE 的方法直接在数据集上估计。由于不需要知道各个维度之间的关系，因此所需数据量大大减少了。估算完这些参数，再代入贝叶斯定理中得到类别的后验分布。

## 小结

分类任务分为两类。对于需要直接输出类别的任务，感知机算法中我们在线性模型的基础上加入符号函数作为激活函数，那么就能得到这个类别。但是符号函数不光滑，于是我们采用错误驱动的方式，引入

$$\sum\limits_{x_i\in\mathcal{D}_{wrong}}-y_iw^Tx_i$$

作为损失函数，然后最小化这个误差，采用批量随机梯度下降的方法来获取最佳的参数值。

而在线性判别分析中，我们将线性模型看作是数据点在某一个方向的投影，采用类内小、类间大的思路来定义损失函数。其中类内小定义为两类数据的方差之和，类间大定义为两类数据中心点的间距。对损失函数求导得到参数的方向，这个方向就是 \(S_w^{-1}(\overline{x}{c_1}-\overline{x}{c_2})\)，其中 \(S_w\) 为原数据集两类的方差之和。

另一种任务是输出分类的概率。对于概率模型，我们有两种方案。第一种是判别模型，也就是直接对类别的条件概率建模。将线性模型套入 Logistic 函数中，我们就得到了 Logistic 回归模型，这里的概率解释是两类的联合概率比值的对数是线性的。我们定义的损失函数是交叉熵（等价于 MLE），对这个函数求导得到

$$\frac{1}{N}\sum\limits_{i=1}^N(y_i-p_1)x_i$$

同样利用批量随机梯度（上升）的方法进行优化。

第二种是生成模型。生成模型引入了类别的先验，在高斯判别分析中，我们对数据集的数据分布作出了假设，其中类先验是二项分布，而每一类的似然是高斯分布。对这个联合分布的对数似然进行最大化就得到了参数：

$$\frac{\sum\limits_{i=1}^Ny_ix_i}{N_1},\quad \frac{\sum\limits_{i=1}^N(1-y_i)x_i}{N_0},\quad \frac{N_1S_1+N_2S_2}{N},\quad \frac{N_1}{N}$$

在朴素贝叶斯中，我们进一步对属性的各个维度之间的依赖关系作出假设，条件独立性假设大大减少了数据量的需求。

# 四、降维

我们知道，解决过拟合的问题除了正则化和添加数据之外，降维就是最好的方法。降维的思路来源于维度灾难的问题，我们知道 n 维球的体积为：

那么在球体积与边长为 2R 的超立方体比值为：

这就是所谓的维度灾难，在高维数据中，主要样本都分布在立方体的边缘，所以数据集更加稀疏。

降维的算法分为：

1. 直接降维，特征选择
1. 线性降维，PCA，MDS 等
1. 分线性，流形包括 Isomap，LLE 等
为了方便，我们首先将协方差矩阵（数据集）写成中心化的形式：

这个式子利用了中心矩阵 H 的对称性，这也是一个投影矩阵。

## 线性降维\-主成分分析 PCA

### 损失函数

主成分分析中，我们的基本想法是将所有数据投影到一个子空间中，从而达到降维的目标。为了寻找这个子空间，我们基本想法是：

1. 所有数据在子空间中更为分散
1. 损失的信息最小，即在补空间的分量少
原来的数据很有可能各个维度之间是相关的，于是我们希望找到一组 p 个新的线性无关的单位基 \(u_i\)，降维就是取其中的 q 个基。于是对于一个样本 \(x_i\)，经过这个坐标变换后：

对于数据集来说，我们首先将其中心化然后再取上面的式子的第一项，并使用其系数的平方平均作为损失函数并最大化：

由于每个基都是线性无关的，于是每一个 \(u_j\) 的求解可以分别进行，使用拉格朗日乘子法：

于是：

可见，我们需要的基就是协方差矩阵的本征矢。损失函数最大取在本征值前 q 个最大值。

下面看其“损失的信息最少”这个条件，同样使用系数的平方平均作为损失函数，并最小化：

同样地：

损失函数最小取在本征值中剩下的较小几个值。数据集的协方差矩阵可以写成 \(S = UΛU^T\)，直接对这个表达式当然可以得到本征矢。

### SVD 与 PCoA

下面使用实际训练时常常使用的 SVD 直接求得这 q 个本征矢。

对中心化后的数据集进行奇异值分解：

于是：

因此，我们直接对中心化后的数据集进行 SVD，就可以得到特征值和特征向量 V，在新坐标系中的坐标就是：

由上面的推导，我们也可以得到另一种方法 PCoA 主坐标分析，定义并进行特征值分解：

由于：

于是可以直接得到坐标。这两种方法都可以得到主成分，但是由于方差矩阵是 p×p 的，而 T 是 N×N 的，所以对样本量较少的时候可以采用 PCoA 的方法。

### p\-PCA

下面从概率的角度对 PCA 进行分析，概率方法也叫 p\-PCA。我们使用线性模型，类似之前 LDA，我们选定一个方向。对原数据 x 属于 p 维实空间，降维后的数据 z 属于 q 维实空间，且 q<p。降维通过一个矩阵变换（投影）进行：

对于这个模型，我们可以使用期望\-最大（EM）的算法进行学习。在进行推断的时候需要求得 \(p(z|x)\)，推断的求解过程和线性高斯模型类似。

## 小结

降维是解决维度灾难和过拟合的重要方法，除了直接的特征选择外，我们还可以采用算法的途径对特征进行筛选。线性的降维方法以 PCA 为代表，在 PCA 中，我们只要直接对数据矩阵进行中心化，然后求奇异值分解或者对数据的协方差矩阵进行分解，就可以得到其主要维度。非线性学习的方法如流形学习则将投影面从平面改为超曲面。

# 五、支持向量机

支持向量机（SVM）算法在分类问题中有着重要地位，其主要思想是最大化两类之间的间隔。按照数据集的特点：

1. 线性可分问题，如之前的感知机算法处理的问题
1. 线性可分，但只有一点点错误点，如感知机算法发展出来的 Pocket 算法处理的问题
1. 非线性问题，完全不可分，如多层感知机和深度学习处理的问题
这三种情况对于 SVM 分别有下面三种处理手段：

1. hard\-margin SVM
1. soft\-margin SVM
1. kernel method
SVM 的求解中大量用到了 Lagrange 乘子法，首先对这种方法进行介绍。

## 约束优化问题

一般地，约束优化问题（原问题）可以写成：

定义 Lagrange 函数：

那么原问题可以等价于无约束形式：

这是由于，当满足原问题的不等式约束时，只有 lambda\_i=0 才能取得最大值；如果不满足原问题的不等式约束，那么最大值就为 \+infty，由于需要取最小值，于是不会取到这个情况。

这个问题的对偶形式为：

对偶问题是关于 lambda 和 eta 的最大化问题，并且总有：

对偶问题的解小于等于原问题。对于一个凸优化问题，如果满足某些条件如 Slater 条件，那么它和其对偶问题满足强对偶关系。记问题的定义域为：

于是 Slater 条件为：

其中 Relint 表示相对内部（不包含边界的内部）。

上面介绍了原问题和对偶问题的对偶关系，但是实际还需要对参数进行求解，求解方法使用 KKT 条件进行：

1. 可行域：
$$	\begin{aligned}
m_i(x^*)&\le 0\\
n_j(x^*)&=0\\
\lambda^*&\ge 0
\end{aligned}$$
1. 互补松弛：
$$\lambda_i^*m_i(x^*)=0$$
1. 梯度为 0：
$$\left.\frac{\partial L(x,\lambda^*,\eta^*)}{\partial x}\right|_{x=x^*}=0$$
## Hard\-margin SVM

支撑向量机也是一种硬分类模型。在之前的感知机模型中，我们在线性模型的基础上叠加了符号函数。在几何直观上，如果两类分得很开，那么会存在无穷多条线可以将两类分开。在 SVM 中，我们引入最大化间隔这个概念，间隔指的是数据和直线的距离的最小值，因此最大化这个值反映了我们的模型倾向。

分割的超平面可以写为：

那么最大化间隔（约束为分类任务要求）可以写为：

进一步化为：

对于这个约束，不妨固定：

这是由于分开两类的超平面的系数经过比例放缩不会改变这个平面，也相当于给超平面的系数作出了约束。化简后的式子可以表示为：

这就是一个包含 N 个约束的凸优化问题。

如果样本数量或维度非常高，直接求解困难甚至不可解，于是需要对这个问题进一步处理。引入 Lagrange 函数：

原问题等价于：

交换最小和最大值得到对偶问题：

由于不等式约束是仿射函数，对偶问题和原问题等价。

对 b 求偏导：

对 w 求偏导：

将上面两个参数代入，得到对偶问题：

从 KKT 条件得到超平面的参数：

于是对应的最佳参数为：

于是这个超平面的参数 w 就是数据点的线性组合，最终的参数值就是部分满足 \(y_i(w^Tx_i+b)=1\) 的向量的线性组合，这些向量也叫支撑向量。

## Soft\-margin SVM

Hard\-margin SVM 只对可分数据可解。对于不可分的情况，我们的基本想法是在损失函数中加入错误分类的可能性。错误分类的个数可以写成：

这个函数不连续，可以将其改写为：

求和符号中的式子又叫做 Hinge Function。

将这个错误加入 Hard\-margin SVM 中，于是：

这个式子中，常数 C 可以看作允许的错误水平。

## Kernel Method

核方法可以应用在很多问题上。在分类问题中，对于严格不可分问题，我们引入一个特征转换函数，将原来的不可分数据集变为可分数据集，然后再应用已有模型。往往将低维空间的数据集变为高维空间的数据集后，数据会变得可分。

应用在 SVM 中时，观察上面的 SVM 对偶问题，在求解的时候需要求得内积。于是不可分数据在通过特征变换后，需要求得变换后的内积。我们常常很难显式求得变换函数，于是直接引入内积的变换函数：

称 \(k(x,x')\) 为一个正定核函数，其中 H 是 Hilbert 空间（完备的线性内积空间）。

例如：

是一个核函数。正定核函数有下面的等价定义：

1. 对称性
1. 正定性
也就是对于任意样本点 \(x_1,x_2,…,x_N\) 属于样本空间 X，对应的 Gram Matrix

是半正定的。

## 小结

分类问题在很长一段时间都依赖 SVM。对于严格可分的数据集，Hard\-margin SVM 选定一个超平面，保证所有数据到这个超平面的距离最大。对这个平面施加约束，固定 \(y_i(w^Tx_i+b)=1\)，得到了一个凸优化问题。将这个问题变换成为对偶问题，可以得到等价的解，并求出约束参数：

对需要的超平面参数的求解采用强对偶问题的 KKT 条件进行。

当允许一点错误的时候，可以在 Hard\-margin SVM 中加入错误项，用 Hinge Function 表示错误项的大小。

对于完全不可分的问题，我们采用特征转换的方式。在 SVM 中，我们引入正定核函数来直接对内积进行变换，只要这个变换满足对称性和正定性，那么就可以用作核函数。
